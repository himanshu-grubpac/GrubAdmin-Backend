import { createHandlers } from "@/utils/hono-factory";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getSupportCategoriesRequestQueryValidator } from "delivery/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { DELIVERY_VERTICAL_NAME } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { getFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { APIResponse } from "@/types/api";
import { enrichFaqCategoriesResponse } from "@/utils/asset-url.ts";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	faq_categories: (Record<string, unknown> & { icon_url: string })[];
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

		const enrichedCategories = await enrichFaqCategoriesResponse(categoriesResponse.faq_categories as any);

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					faq_categories: enrichedCategories,
					count: categoriesResponse.count,
				},
				pagination: calculatePagination(page ?? 1, limit ?? categoriesResponse.count, categoriesResponse.count),
			},
			{
				status: 200,
			},
		);
	},
);
