import { createHandlers } from "@/utils/hono-factory";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getSupportCategoriesRequestQueryValidator } from "@/modules/medical-mobile/driver/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { MEDICAL_VERTICAL_NAME } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { getFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { faq_category } from "@/db/types";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	faq_categories: faq_category[];
	count: number;
}

export const getSupportCategoriesHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	getSupportCategoriesRequestQueryValidator,
	async (context) => {
		const { query, id, limit, page } = context.req.valid("query");

		const vertical = await getVertical(MEDICAL_VERTICAL_NAME);
		if (!vertical) {
			throw new APIError("No such vertical found!", undefined, undefined, 400);
		}

		const categoriesResponse = await getFaqCategory({
			vertical_id: vertical.id,
			ids: id ? [id] : undefined,
			query,
			fetchAll: !limit,
			pageSize: limit,
			pageNumber: page,
			questionType: "published",
			state: "active",
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: categoriesResponse,
			},
			{ status: 200 },
		);
	},
);
