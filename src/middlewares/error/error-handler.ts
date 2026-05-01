import { type Context } from "hono";
import { APIError } from "@/types/error";
import { Prisma } from "@/db/prisma";
import { JsonWebTokenError } from "jsonwebtoken";
import { ZodError } from "zod";
import { type StatusCode } from "hono/utils/http-status";
import { logger } from "@/utils/logger";

export const globalErrorHandler = async (error: unknown, ctx: Context) => {
	logger.error("API Error occurred:", error);

	const client_id = ctx.get("client_id");

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
				},
				{
					status: 404,
				},
			);
		}
	}

	if (error instanceof ZodError) {
		return ctx.json(
			{
				success: false,
				code: 400,
				error: error.issues[0]?.message ?? "",
				client_id,
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
		};

		ctx.status(finalData.code as StatusCode);
		return ctx.json(finalData);
	}

	if (error instanceof Error) {
		return ctx.json(
			{
				success: false,
				error: error.message,
				code: 400,
				client_id,
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
		},
		{
			status: 500,
		},
	);
};
