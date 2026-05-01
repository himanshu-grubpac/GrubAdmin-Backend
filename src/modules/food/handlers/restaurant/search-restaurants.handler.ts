import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { searchVerticalFoodRestaurants } from "@/db/actions/restaurant.actions.ts";
import type { APIResponse } from "@/types/api";
import { searchRestaurantRequestQueryValidator } from "food/validators/restaurant.validators.ts";

export const searchRestaurantsHandler = createHandlers(
	foodAuthGuard(),
	searchRestaurantRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const restaurants = await searchVerticalFoodRestaurants({
			query,
			client_id,
			limit,
			status,
		});

		const formattedRestaurants = restaurants.map((r) => ({
			id: r.id,
			name: r.name,
			status: r.status,
			box_count: r._count.restaurant_boxes,
			created_at: r.created_at,
			updated_at: r.updated_at,
		}));

		return context.json<APIResponse<{ restaurants: typeof formattedRestaurants }>>(
			{
				success: true,
				code: 200,
				data: { restaurants: formattedRestaurants },
			},
			{ status: 200 },
		);
	},
);

