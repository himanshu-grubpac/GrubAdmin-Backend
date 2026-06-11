import { type Context } from "hono";
import { APIError } from "@/types/error";
import { Prisma } from "@/db/prisma";
import { JsonWebTokenError } from "jsonwebtoken";
import { ZodError } from "zod";
import { type StatusCode } from "hono/utils/http-status";
import { logger } from "@/utils/logger";

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

			return ctx.json(
				{
					success: false,
					error: errorMessage,
					code: 400,
					client_id,
					request_id: errCtx.request_id,
				},
				{
					status: 400,
				},
			);
		}

		if (error.code === "P2023") {
			return ctx.json(
				{
					success: false,
					error: "Either no data found or some inconsistent column data type found.",
					code: 400,
					client_id,
					request_id: errCtx.request_id,
				},
				{
					status: 400,
				},
			);
		}

		if (error.code === "P2025") {
			return ctx.json(
				{
					success: false,
					error: "Data not found!!",
					code: 404,
					client_id,
					request_id: errCtx.request_id,
				},
				{
					status: 404,
				},
			);
		}

		// Unhandled Prisma error
		return ctx.json(
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
			{ status: 500 },
		);
	}

	if (error instanceof Prisma.PrismaClientInitializationError) {
		logger.error(`Prisma initialization error: ${error.message}`);
		return ctx.json(
			{
				success: false,
				error: "Service temporarily unavailable. Database connection issue.",
				code: 503,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "database_connection_failed",
			},
			{ status: 503 },
		);
	}

	if (error instanceof Prisma.PrismaClientRustPanicError) {
		logger.error(`Prisma rust panic: ${error.message}`);
		return ctx.json(
			{
				success: false,
				error: "Internal database error. Please try again.",
				code: 500,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "prisma_rust_panic",
			},
			{ status: 500 },
		);
	}

	if (error instanceof ZodError) {
		return ctx.json(
			{
				success: false,
				code: 400,
				error: error.issues[0]?.message ?? "",
				client_id,
				request_id: errCtx.request_id,
				root_cause: "validation_error",
			},
			{
				status: 400,
			},
		);
	}

	if (error instanceof JsonWebTokenError) {
		return ctx.json(
			{
				success: false,
				error: error.message,
				code: 401,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "jwt_error",
			},
			{
				status: 401,
			},
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

		const finalData = {
			success: false,
			error: error.message,
			code: error.code,
			data: error.data,
			...templateData,
			client_id,
			request_id: errCtx.request_id,
		};

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
			return ctx.json(
				{
					success: false,
					error: "Service temporarily unavailable. Database connection issue.",
					code: 503,
					client_id,
					request_id: errCtx.request_id,
					root_cause: "mongodb_buffering_timeout",
				},
				{ status: 503 },
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
			return ctx.json(
				{
					success: false,
					error: "Service temporarily unavailable. Database connection issue.",
					code: 503,
					client_id,
					request_id: errCtx.request_id,
					root_cause: "mongodb_connection_error",
				},
				{ status: 503 },
			);
		}

		return ctx.json(
			{
				success: false,
				error: error.message,
				code: 400,
				client_id,
				request_id: errCtx.request_id,
				root_cause: "unhandled_error",
			},
			{
				status: 400,
			},
		);
	}

	return ctx.json(
		{
			success: false,
			error: "Internal Server Error",
			code: 500,
			client_id,
			request_id: errCtx.request_id,
			root_cause: "unknown_error",
		},
		{
			status: 500,
		},
	);
};
