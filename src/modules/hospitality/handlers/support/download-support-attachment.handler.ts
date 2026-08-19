import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { downloadSupportAttachmentRequestQueryValidator } from "hospitality/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants.ts";
import { prisma } from "@/db";
import { services } from "@/services";
import { APIError } from "@/types/error";

const sanitizeContentDispositionFilename = (filename: string): string => {
	const stripped = filename.replace(/[\r\n"]/g, "").replace(/[^\x20-\x7E]/g, "_");
	return stripped.slice(0, 255) || "attachment";
};

const buildContentDispositionHeader = (filename: string): string => {
	const safeAscii = sanitizeContentDispositionFilename(filename);
	const encoded = encodeURIComponent(filename)
		.replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
	return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
};

export const downloadSupportAttachmentHandler = createHandlers(
	hospitalityAuthGuard(),
	downloadSupportAttachmentRequestQueryValidator,
	async (context) => {
		const { path: pathParam } = context.req.valid("query");

		if (!pathParam.startsWith("faq/")) {
			throw new APIError("Access denied: Invalid attachment path", undefined, undefined, 403);
		}

		const vertical = await getVertical(HOSPITALITY_VERTICAL_NAME);

		if (!vertical) {
			throw new APIError("No such vertical found!", undefined, undefined, 400);
		}

		const faq = await prisma.faq_question.findFirst({
			where: {
				status: { not: "deleted" },
				publishing_status: "published",
				attachments: {
					array_contains: pathParam,
				},
				categories: {
					some: {
						category: {
							vertical_id: vertical.id,
						},
					},
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

			const fileBuffer = new Uint8Array(await s3Response.Body.transformToByteArray());

			const baseName = pathParam.split("/").pop() || pathParam;
			let originalFilename = baseName;
			if (/^[A-Za-z0-9]{26}-/.test(baseName)) {
				originalFilename = baseName.substring(27);
			}

			const contentType = s3Response.ContentType || "application/octet-stream";

			return context.body(fileBuffer, 200, {
				"Content-Type": contentType,
				"Content-Disposition": buildContentDispositionHeader(originalFilename),
			});
		} catch (error: any) {
			if (error.name === "NoSuchKey") {
				throw new APIError("Attachment file not found on storage", undefined, undefined, 404);
			}
			throw new APIError(
				error.message || "Failed to download attachment",
				undefined,
				undefined,
				500,
			);
		}
	},
);
