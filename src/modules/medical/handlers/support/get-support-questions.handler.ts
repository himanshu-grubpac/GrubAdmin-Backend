import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getSupportQuestionsRequestQueryValidator } from "medical/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { MEDICAL_VERTICAL_NAME } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { getFaqQuestions } from "@/db/actions/faq.actions.ts";
import type { faq_question } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	faqs: faq_question[];
	count: number;
}

export const getSupportQuestionsHandler = createHandlers(
	medicalAuthGuard(),
	getSupportQuestionsRequestQueryValidator,
	async (context) => {
		const { query, category_id, page, limit } = context.req.valid("query");

		const vertical = await getVertical(MEDICAL_VERTICAL_NAME);

		if (!vertical) {
			throw new APIError("No such vertical found!", undefined, undefined, 400);
		}

		const questionsResponse = await getFaqQuestions({
			vertical_id: vertical.id,
			query,
			state: "active",
			publishing_status: "published",
			category_id,
			pageNumber: page,
			pageSize: limit,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					faqs: questionsResponse.faqs,
					count: questionsResponse.faqs.length,
				},
				pagination: calculatePagination(page ?? 1, limit ?? questionsResponse.count, questionsResponse.count),
			},
			{ status: 200 },
		);
	},
);
