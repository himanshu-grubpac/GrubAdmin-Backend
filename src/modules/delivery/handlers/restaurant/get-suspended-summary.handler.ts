import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

/**
 * Aggregate impact of activating all suspended restaurants for the tenant.
 * GET /delivery/restaurant/suspended/summary
 */
export const getRestaurantSuspendedSummaryHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	async (context) => {
		const { client_id } = context.var;

		const suspendedRestaurants = await prisma.restaurant.findMany({
			where: { client_id, status: "suspended" },
			select: { id: true },
		});

		const restaurantIds = suspendedRestaurants.map((r) => r.id);
		const restaurant_count = restaurantIds.length;

		if (restaurant_count === 0) {
			return context.json<
				APIResponse<{
					boxes: number;
					managers: number;
					drivers: number;
					restaurant_count: number;
				}>
			>(
				{
					success: true,
					code: 200,
					data: {
						boxes: 0,
						managers: 0,
						drivers: 0,
						restaurant_count: 0,
					},
				},
				{ status: 200 },
			);
		}

		const [boxes, managers, drivers] = await Promise.all([
			prisma.restaurant_box.count({
				where: { restaurant_id: { in: restaurantIds } },
			}),
			prisma.vertical_delivery_employee.count({
				where: {
					client_id,
					restaurant_id: { in: restaurantIds },
					role: "manager",
				},
			}),
			prisma.vertical_delivery_employee.count({
				where: {
					client_id,
					restaurant_id: { in: restaurantIds },
					role: "delivery",
				},
			}),
		]);

		return context.json<
			APIResponse<{
				boxes: number;
				managers: number;
				drivers: number;
				restaurant_count: number;
			}>
		>(
			{
				success: true,
				code: 200,
				data: {
					boxes,
					managers,
					drivers,
					restaurant_count,
				},
			},
			{ status: 200 },
		);
	},
);
