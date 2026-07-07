import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { services } from "@/services";

export const downloadSupportAttachmentHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const question_id = context.req.query("question_id");
		const attachment_key = context.req.query("attachment_key");

		if (!question_id || !attachment_key) {
			throw new APIError("Missing question_id or attachment_key", undefined, undefined, 400);
		}

		const question = await prisma.faq_question.findUnique({
			where: { id: question_id },
		});

		if (!question) {
			throw new APIError("FAQ question not found", undefined, undefined, 404);
		}

		const attachments = question.attachments as Array<{ key: string; name: string }> | null;
		if (!attachments || !attachments.find((a) => a.key === attachment_key)) {
			throw new APIError("Attachment not found", undefined, undefined, 404);
		}

		const signedUrl = await services.s3.generatePresignedUrl(attachment_key, 3600);

		return context.redirect(signedUrl);
	},
);
