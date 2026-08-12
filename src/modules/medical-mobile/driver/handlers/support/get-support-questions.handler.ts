import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getSupportQuestionsRequestQueryValidator } from "@/modules/medical-mobile/driver/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { MEDICAL_VERTICAL_NAME } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { getFaqQuestions } from "@/db/actions/faq.actions.ts";
import type { faq_question } from "@/db/types";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	faqs: faq_question[];
	count: number;
}

export const getSupportQuestionsHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	getSupportQuestionsRequestQueryValidator,
	async (context) => {
		const { query, category_id, limit, page } = context.req.valid("query");

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
			pageSize: limit,
			pageNumber: page,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: questionsResponse,
			},
			{ status: 200 },
		);
	},
);
