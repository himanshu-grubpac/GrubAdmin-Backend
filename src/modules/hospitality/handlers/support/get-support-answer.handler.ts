import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getSupportAnswerRequestQueryValidator } from "hospitality/validators/support.validators.ts";
import { getFaqQuestionById } from "@/db/actions/faq.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	answer: string;
	publishing_status: string;
	status: string;
	attachments: any[];
	faq: {
		id: string;
		question: string;
	};
}

export const getSupportAnswerHandler = createHandlers(
	hospitalityAuthGuard(),
	getSupportAnswerRequestQueryValidator,
	async (context) => {
		const { faq_id } = context.req.valid("query");

		const faq = await getFaqQuestionById(faq_id);

		if (!faq) {
			throw new APIError("FAQ not found", undefined, undefined, 404);
		}

		if (faq.publishing_status !== "published") {
			throw new APIError("FAQ not found", undefined, undefined, 404);
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					answer: faq.answer,
					publishing_status: faq.publishing_status,
					status: faq.status,
					attachments: (faq.attachments as any[]) || [],
					faq: {
						id: faq.id,
						question: faq.question,
					},
				},
			},
			{ status: 200 },
		);
	},
);
