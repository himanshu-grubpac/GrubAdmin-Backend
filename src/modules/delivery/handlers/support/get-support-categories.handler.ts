import { createHandlers } from "@/utils/hono-factory";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getSupportCategoriesRequestQueryValidator } from "delivery/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { DELIVERY_VERTICAL_NAME } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { getFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { faq_category } from "@/db/types";
import type { APIResponse } from "@/types/api";

import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	faq_categories: faq_category[];
	count: number;
}

export const getSupportCategoriesHandler = createHandlers(
	deliveryAuthGuard(),
	getSupportCategoriesRequestQueryValidator,
	async (context) => {
		const { query, id, page, limit } = context.req.valid("query");

		const vertical = await getVertical(DELIVERY_VERTICAL_NAME);

		if (!vertical) {
			throw new APIError("No such vertical found!", undefined, undefined, 400);
		}

		const categoriesResponse = await getFaqCategory({
			vertical_id: vertical.id,
			ids: id ? [id] : undefined,
			query,
			pageNumber: page,
			pageSize: limit,
			questionType: "published",
			state: "active",
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					faq_categories: categoriesResponse.faq_categories,
					count: categoriesResponse.faq_categories.length,
				},
				pagination: calculatePagination(page ?? 1, limit ?? categoriesResponse.count, categoriesResponse.count),
			},
			{
				status: 200,
			},
		);
	},
);
