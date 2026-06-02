import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getRestaurantsRequestQueryValidator } from "delivery/validators/restaurant.validators";
import type { restaurant } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { getRestaurants } from "@/db/actions/restaurant.actions";
import { withFullAddresses } from "@/utils/restaurant.ts";
import { calculatePagination } from "@/utils/pagination.ts";
import { cleanQueryObject } from "@/utils/clean-query.ts";

interface ResponseData {
	restaurants: (restaurant & { full_address: string })[];
	count: number;
}

export const getRestaurantsHandler = createHandlers(
	deliveryAuthGuard(),
	getRestaurantsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;

		const { query, status, manager, driver, delivery, box, page, limit, group_by, exclude_restaurant_ids, group_by_selected_table } = context.req.valid("query") as any;
		
		let finalManager: boolean | undefined = manager;
		let finalDriver: boolean | undefined = driver || delivery;
		let finalBox: boolean | undefined = box;


		const restaurantsData = await getRestaurants({
			query: query as string | undefined,
			status: status as any,
			manager: finalManager,
			driver: finalDriver,
			box: finalBox,
			page_size: limit,
			page_number: page,
			fetch_all: !!group_by || (limit === undefined && page === undefined),
			client_id,
			exclude_restaurant_ids: exclude_restaurant_ids as string[] | undefined,
		});

		// Safe slice bounds: when limit is undefined, return all rows
		const finalPage = page ?? 1;
		const finalLimit = limit;  // may be undefined → means "all"
		const startIndex = finalLimit !== undefined ? (finalPage - 1) * finalLimit : 0;
		const endIndex   = finalLimit !== undefined ? startIndex + finalLimit      : undefined;

		const restaurants = withFullAddresses(restaurantsData.restaurants).map((r: any) => ({
			...r,
			manager: r.manager ? { ...r.manager, employee_id: r.manager.employee_display_id } : null,
		})) as any;

		if (group_by === "boxes") {
			const withBoxes: any[] = [];
			const withoutBoxes: any[] = [];

			for (const r of restaurants) {
				if ((r as any)._count?.boxes > 0) {
					withBoxes.push(r);
				} else {
					withoutBoxes.push(r);
				}
			}

			const groups: Record<string, any> = {};
			let totalCountAcrossGroups = 0;

			if (!group_by_selected_table || group_by_selected_table === "with_boxes") {
				const sliced = withBoxes.slice(startIndex, endIndex);
				groups.with_boxes = {
					array: sliced,
					count: withBoxes.length,
					pagination: calculatePagination(finalPage, finalLimit ?? withBoxes.length, withBoxes.length),
				};
				totalCountAcrossGroups += withBoxes.length;
			}

			if (!group_by_selected_table || group_by_selected_table === "without_boxes") {
				const sliced = withoutBoxes.slice(startIndex, endIndex);
				groups.without_boxes = {
					array: sliced,
					count: withoutBoxes.length,
					pagination: calculatePagination(finalPage, finalLimit ?? withoutBoxes.length, withoutBoxes.length),
				};
				totalCountAcrossGroups += withoutBoxes.length;
			}

			return context.json<APIResponse<{ groups: typeof groups; count: number; total_count: number }>>(
				{
					success: true,
					code: 200,
					data: {
						groups,
						count: totalCountAcrossGroups,
						total_count: restaurantsData.count,
					},
					pagination: calculatePagination(finalPage, finalLimit ?? restaurantsData.count, restaurantsData.count),
				},
				{ status: 200 },
			);
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					count: restaurants.length,
					restaurants: restaurants,
				},
				pagination: calculatePagination(finalPage, finalLimit ?? restaurantsData.count, restaurantsData.count),
			},
			{
				status: 200,
			},
		);
	},
);
