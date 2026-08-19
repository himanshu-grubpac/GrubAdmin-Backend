import { type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { APIError } from "@/types/error";
import { Prisma } from "@/db/prisma";
import { JsonWebTokenError } from "jsonwebtoken";
import { ZodError } from "zod";
import { type StatusCode } from "hono/utils/http-status";
import { logger } from "@/utils/logger";

/** Runtime check — avoids frozen NODE_ENV from env module load (testable). */
export const isProductionErrorSanitizationEnabled = (): boolean =>
	(process.env.NODE_ENV || "development") === "production";

export const GENERIC_SERVER_ERROR_MESSAGE =
	"Something went wrong. Please try again later.";

export const GENERIC_UNAVAILABLE_MESSAGE =
	"Service temporarily unavailable. Database connection issue.";

/** Ops-facing root_cause codes preserved on sanitized 5xx prod responses (P3-05 runbook). */
export const PRODUCTION_OPS_ROOT_CAUSES = new Set([
	"mysql_pool_timeout",
	"mongodb_buffering_timeout",
	"mongodb_connection_error",
	"database_connection_failed",
]);

const INTERNAL_CLIENT_RESPONSE_KEYS = new Set([
	"stack",
	"prisma_code",
	"prisma_meta",
]);

/**
 * Strip internal diagnostics from client JSON in production.
 * Dev/staging responses pass through unchanged for debugging.
 */
export const sanitizeClientErrorPayload = (
	body: Record<string, unknown>,
	httpStatus: number,
): Record<string, unknown> => {
	if (!isProductionErrorSanitizationEnabled()) {
		return body;
	}

	const sanitized: Record<string, unknown> = { ...body };

	for (const key of INTERNAL_CLIENT_RESPONSE_KEYS) {
		delete sanitized[key];
	}

	if (httpStatus < 500) {
		return sanitized;
	}

	const rootCause = sanitized.root_cause;
	const keepRootCause =
		typeof rootCause === "string" && PRODUCTION_OPS_ROOT_CAUSES.has(rootCause);

	if (!keepRootCause) {
		delete sanitized.root_cause;
	}

	const useUnavailableMessage =
		httpStatus === 503 ||
		(typeof rootCause === "string" && PRODUCTION_OPS_ROOT_CAUSES.has(rootCause));

	sanitized.error = useUnavailableMessage
		? GENERIC_UNAVAILABLE_MESSAGE
		: GENERIC_SERVER_ERROR_MESSAGE;

	return sanitized;
};

const respondError = (
	ctx: Context,
	body: Record<string, unknown>,
	status: 400 | 401 | 403 | 404 | 429 | 500 | 503,
) => ctx.json(sanitizeClientErrorPayload(body, status), { status });

/**
 * Extract a structured context object for error logging.
 */
const getErrorContext = (ctx: Context) => ({
	path: ctx.req.path,
	method: ctx.req.method,
	client_id: ctx.get("client_id"),
	user_id: ctx.get("user_id"),
	request_id: (ctx as any).requestId || ctx.req.header("x-request-id") || "unknown",
});

export const globalErrorHandler = async (error: unknown, ctx: Context) => {
	const errCtx = getErrorContext(ctx);
	const client_id = errCtx.client_id;

	// Structured error log with all context fields
	const errorLog: Record<string, unknown> = {
		request_id: errCtx.request_id,
		path: errCtx.path,
		method: errCtx.method,
		client_id: errCtx.client_id,
		user_id: errCtx.user_id,
		root_cause: error instanceof Error ? error.constructor.name : typeof error,
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
	};

	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		errorLog.prisma_code = error.code;
		errorLog.prisma_meta = error.meta;
	}

	logger.error("API Error:", errorLog);

	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002" || error.code === "P2014") {
			const targets = error.meta?.target;
			let fieldNames: string[] = [];

			if (Array.isArray(targets)) {
				fieldNames = targets.map((t) => String(t));
			} else if (typeof targets === "string") {
				fieldNames = [targets];
			}

			let errorMessage = "Some unique item collision occurred!!";
			if (fieldNames.length > 0) {
				const humanizedFields = fieldNames.map((f) =>
					f.replace(/_/g, " ").replace(/\s+/g, " ").trim(),
				);
				const fieldText =
					humanizedFields.length > 1
						? `Combination of ${humanizedFields.join(" and ")}`
						: (humanizedFields[0] ?? "");

				if (fieldText) {
					errorMessage = `${fieldText.charAt(0).toUpperCase() + fieldText.slice(1)} already exists!!`;
				}
			}

			return respondError(
				ctx,
				{
					success: false,
					error: errorMessage,
					code: 400,
					client_id,
					request_id: errCtx.request_id,
				},
				400,
			);
		}

		if (error.code === "P2023") {
			return respondError(
				ctx,
				{
					success: false,
					error: "Either no data found or some inconsistent column data type found.",
					code: 400,
					client_id,
					request_id: errCtx.request_id,
				},
				400,
			);
		}

		if (error.code === "P2025") {
			return respondError(
				ctx,
				{
					success: false,
					error: "Data not found!!",
					code: 404,
					client_id,
					request_id: errCtx.request_id,
				},
				404,
			);
		}

		// Unhandled Prisma error
		return respondError(
			ctx,
			{
				success: false,
				error: "Database error. Please try again.",
				code: 500,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "prisma_known_error",
				prisma_code: error.code,
				prisma_meta: error.meta,
			},
			500,
		);
	}

	if (error instanceof Prisma.PrismaClientInitializationError) {
		logger.error(`Prisma initialization error: ${error.message}`);
		return respondError(
			ctx,
			{
				success: false,
				error: GENERIC_UNAVAILABLE_MESSAGE,
				code: 503,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "database_connection_failed",
			},
			503,
		);
	}

	if (error instanceof Prisma.PrismaClientRustPanicError) {
		logger.error(`Prisma rust panic: ${error.message}`);
		return respondError(
			ctx,
			{
				success: false,
				error: "Internal database error. Please try again.",
				code: 500,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "prisma_rust_panic",
			},
			500,
		);
	}

	if (error instanceof ZodError) {
		return respondError(
			ctx,
			{
				success: false,
				code: 400,
				error: error.issues[0]?.message ?? "",
				client_id,
				request_id: errCtx.request_id,
				root_cause: "validation_error",
			},
			400,
		);
	}

	if (error instanceof JsonWebTokenError) {
		return respondError(
			ctx,
			{
				success: false,
				error: error.message,
				code: 401,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "jwt_error",
			},
			401,
		);
	}

	if (error instanceof HTTPException) {
		const status = (error.status ?? 500) as 400 | 401 | 403 | 404 | 429 | 500 | 503;
		return respondError(
			ctx,
			{
				success: false,
				error: error.message || "Request failed",
				code: status,
				client_id,
				request_id: errCtx.request_id,
				root_cause: status === 400 ? "invalid_request_body" : "http_exception",
			},
			status,
		);
	}

	if (error instanceof APIError) {
		const templatePath = error.templatePath;
		let templateData = {};

		if (templatePath) {
			const { errorTemplates } = await import("@/configs/error-templates");
			const keys = templatePath.split(".");
			let current: any = errorTemplates;
			for (const key of keys) {
				current = current?.[key];
			}

			if (current && typeof current === "object" && "message" in current) {
				const template = current as any;
				let toast_btn_action = template.error_toast_btn_action;
				if (toast_btn_action && error.data?.id) {
					toast_btn_action = toast_btn_action.replace("{id}", error.data.id);
				}

				templateData = {
					error: template.message,
					code: template.code || error.code || 400,
					error_toast_title: template.error_toast_title,
					error_toast_description: template.error_toast_description,
					error_toast_btn_title: template.error_toast_btn_title,
					error_toast_btn_action: toast_btn_action,
				};
			}
		}

		const finalData = sanitizeClientErrorPayload(
			{
				success: false,
				error: error.message,
				code: error.code,
				data: error.data,
				...templateData,
				client_id,
				request_id: errCtx.request_id,
			},
			error.code ?? 400,
		);

		ctx.status(finalData.code as StatusCode);
		return ctx.json(finalData);
	}

	if (error instanceof Error) {
		// Check if this is a Mongoose/MongoDB error (buffering timeout or connection error)
		const errorName = error.name || "";
		const errorMessage = error.message || "";

		// Mongoose buffering timeout errors should return 503, not 400
		if (
			errorName.includes("MongooseError") ||
			errorMessage.includes("buffering timed out") ||
			errorMessage.includes("MongooseError")
		) {
			logger.error(`MongoDB operation failed: ${errorMessage}`, {
				path: errCtx.path,
				client_id,
				request_id: errCtx.request_id,
			});
			return respondError(
				ctx,
				{
					success: false,
					error: GENERIC_UNAVAILABLE_MESSAGE,
					code: 503,
					client_id,
					request_id: errCtx.request_id,
					root_cause: "mongodb_buffering_timeout",
				},
				503,
			);
		}

		// MongoDB connection errors
		if (
			errorName === "MongoServerSelectionError" ||
			errorMessage.includes("getaddrinfo") ||
			errorMessage.includes("MongoNetworkError") ||
			errorMessage.includes("Server selection")
		) {
			logger.error(`MongoDB connection error: ${errorMessage}`, {
				path: errCtx.path,
				request_id: errCtx.request_id,
			});
			return respondError(
				ctx,
				{
					success: false,
					error: GENERIC_UNAVAILABLE_MESSAGE,
					code: 503,
					client_id,
					request_id: errCtx.request_id,
					root_cause: "mongodb_connection_error",
				},
				503,
			);
		}

		// P3-05 / P2-14 — MySQL pool timeout & connection failures (see tracker Runbook).
		// MariaDB driver throws e.g. "pool timeout: failed to retrieve a connection from pool"
		// when DATABASE_POOL_SIZE is exhausted or Aiven TLS/connect is slow (P4-16).
		// Maps to HTTP 503 + root_cause mysql_pool_timeout (kept on delivery/medical/admin
		// prod JSON via PRODUCTION_OPS_ROOT_CAUSES; hospitality wrapper strips root_cause).
		if (
			errorMessage.includes("pool timeout") ||
			errorMessage.includes("failed to retrieve a connection from pool") ||
			errorMessage.includes("Connection lost") ||
			errorMessage.includes("ECONNREFUSED") ||
			errorMessage.includes("ETIMEDOUT")
		) {
			logger.error(`MySQL pool/connection error: ${errorMessage}`, {
				path: errCtx.path,
				client_id,
				request_id: errCtx.request_id,
			});
			return respondError(
				ctx,
				{
					success: false,
					error: GENERIC_UNAVAILABLE_MESSAGE,
					code: 503,
					client_id,
					request_id: errCtx.request_id,
					root_cause: "mysql_pool_timeout",
				},
				503,
			);
		}

		return respondError(
			ctx,
			{
				success: false,
				error: error.message,
				code: 400,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "unhandled_error",
			},
			400,
		);
	}

	return respondError(
		ctx,
		{
			success: false,
			error: "Internal Server Error",
			code: 500,
			client_id,
			request_id: errCtx.request_id,
			root_cause: "unknown_error",
		},
		500,
	);
};
