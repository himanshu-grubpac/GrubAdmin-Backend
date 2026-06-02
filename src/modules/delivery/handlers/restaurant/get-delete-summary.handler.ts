import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const queryValidator = zValidator(
	"query",
	z.object({ id: z.ulid("Please provide a valid restaurant id") }),
	(r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const getDeleteSummaryHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	queryValidator,
	async (context) => {
		const { id } = context.req.valid("query");
		const { client_id } = context.var;

		const restaurant = await prisma.restaurant.findUnique({
			where: { id, client_id },
			include: {
				_count: {
					select: {
						restaurant_boxes: true,
						employees: true,
					},
				},
			},
		});

		if (!restaurant) {
			throw new APIError("Restaurant not found", "delivery.restaurant.delete.NOT_FOUND", undefined, 404);
		}

		const boxCount = restaurant._count.restaurant_boxes;
		const employeeCount = restaurant._count.employees;
		const reassignRequired = boxCount > 0 || employeeCount > 0;

		return context.json<APIResponse<{
			restaurant_id: string;
			name: string;
			active_orders_count: number;
			employee_count: number;
			box_count: number;
			reassign_required: boolean;
			recommended_action: "reassign" | "none";
		}>>(
			{
				success: true,
				code: 200,
				data: {
					restaurant_id: restaurant.id,
					name: restaurant.name,
					active_orders_count: 0,
					employee_count: employeeCount,
					box_count: boxCount,
					reassign_required: reassignRequired,
					recommended_action: reassignRequired ? "reassign" : "none",
				},
			},
			{ status: 200 },
		);
	},
);
