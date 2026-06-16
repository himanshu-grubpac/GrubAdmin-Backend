import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { downloadSupportAttachmentRequestQueryValidator } from "delivery/validators/support.validators.ts";
import { prisma } from "@/db";
import { services } from "@/services";
import { APIError } from "@/types/error";

export const downloadSupportAttachmentHandler = createHandlers(
	deliveryAuthGuard(),
	downloadSupportAttachmentRequestQueryValidator,
	async (context) => {
		const { path: pathParam } = context.req.valid("query");

		// Security: Ensure path starts with 'faq/' to prevent arbitrary directory traversal
		if (!pathParam.startsWith("faq/")) {
			throw new APIError("Access denied: Invalid attachment path", undefined, undefined, 403);
		}

		// Security: Verify that the path belongs to an active (non-deleted) FAQ question
		const faq = await prisma.faq_question.findFirst({
			where: {
				status: { not: "deleted" },
				attachments: {
					array_contains: pathParam,
				},
			},
		});

		if (!faq) {
			throw new APIError("Attachment not found", undefined, undefined, 404);
		}

		try {
			const s3Response = await services.s3.getObjectFromS3(pathParam);

			if (!s3Response.Body) {
				throw new APIError("Attachment is empty or missing content", undefined, undefined, 404);
			}

			// Convert stream to binary data (Uint8Array)
			const fileBuffer = await s3Response.Body.transformToByteArray();

			// Parse original filename (removes 26-char ULID and hyphen prefix, e.g., '01KV2...-' -> '')
			const baseName = pathParam.split("/").pop() || pathParam;
			let originalFilename = baseName;
			if (/^[A-Za-z0-9]{26}-/.test(baseName)) {
				originalFilename = baseName.substring(27);
			}

			const contentType = s3Response.ContentType || "application/octet-stream";

			return context.body(fileBuffer, 200, {
				"Content-Type": contentType,
				"Content-Disposition": `attachment; filename="${originalFilename}"`,
			});
		} catch (error: any) {
			if (error.name === "NoSuchKey") {
				throw new APIError("Attachment file not found on storage", undefined, undefined, 404);
			}
			throw new APIError(
				error.message || "Failed to download attachment",
				undefined,
				undefined,
				500
			);
		}
	},
);
