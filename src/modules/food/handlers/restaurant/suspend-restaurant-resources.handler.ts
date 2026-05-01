import { suspendRestaurantResources } from "@/db/actions/restaurant.actions";
import { foodAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { createHandlers } from "@/utils/hono-factory";
import { suspendRestaurantResourcesRequestBodyValidator } from "food/validators/restaurant.validators";
import { loggerService } from "@/services/system-log.ts";
import { prisma } from "@/db";

export const suspendRestaurantResourcesHandler = createHandlers(
	foodAuthGuard(["admin"]),
	suspendRestaurantResourcesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;

		const { ids, resource_status, destination_restaurant_id } = context.req.valid("json");

		const { user_id, user, type } = context.var;

		// Fetch names for logging
		const restaurants = await prisma.restaurant.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, name: true },
		});

		await suspendRestaurantResources({
			ids,
			client_id,
			resource_status,
			destination_restaurant_id:
				destination_restaurant_id === "" || destination_restaurant_id === null
					? null
					: destination_restaurant_id,
		});

		// Log each suspension
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		for (const res of restaurants) {
			await loggerService.log({
				category: "Restaurant",
				type: "Suspension",
				actor: {
					id: user_id,
					name: actorName,
					role: type,
					table: type === "admin" ? "client" : "vertical_food_employee",
				},
				client_id,
				subject: {
					id: res.id,
					name: res.name,
					type: "restaurant",
				},
			});
		}

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);

