import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
	"json",
	z.object({
		restaurant_ids: z.ulid("Please provide a valid source restaurant id").array().min(1, "Please provide at least one restaurant id"),
		destination_restaurant_id: z.string().ulid("Please provide a valid destination restaurant id"),
	}),
	(r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const validateReassignmentHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	bodyValidator,
	async (context) => {
		const { restaurant_ids, destination_restaurant_id } = context.req.valid("json");
		const { client_id } = context.var;

		if (restaurant_ids.includes(destination_restaurant_id)) {
			throw new APIError(
				"Destination restaurant cannot be one of the source restaurants to reassign.",
				"delivery.restaurant.reassign.SELF_REASSIGNMENT",
				undefined,
				400
			);
		}

		// Verify source restaurants
		const sourceRestaurants = await prisma.restaurant.findMany({
			where: {
				id: { in: restaurant_ids },
				client_id,
			},
		});

		if (sourceRestaurants.length !== restaurant_ids.length) {
			throw new APIError(
				"One or more source restaurants were not found under this client.",
				"delivery.restaurant.reassign.SOURCE_NOT_FOUND",
				undefined,
				404
			);
		}

		// Verify destination restaurant
		const destRestaurant = await prisma.restaurant.findUnique({
			where: {
				id: destination_restaurant_id,
				client_id,
			},
		});

		if (!destRestaurant) {
			throw new APIError(
				"Destination restaurant not found under this client.",
				"delivery.restaurant.reassign.DESTINATION_NOT_FOUND",
				undefined,
				404
			);
		}

		if (destRestaurant.status !== "active") {
			throw new APIError(
				"Destination restaurant must be active to receive reassigned resources.",
				"delivery.restaurant.reassign.DESTINATION_NOT_ACTIVE",
				undefined,
				409
			);
		}

		// Check manager conflict
		const movingManagers = await prisma.vertical_delivery_employee.findMany({
			where: {
				restaurant_id: { in: restaurant_ids },
				role: "manager",
				status: { not: "suspended" },
			},
		});

		if (movingManagers.length > 0) {
			const destManager = await prisma.vertical_delivery_employee.findFirst({
				where: {
					restaurant_id: destination_restaurant_id,
					role: "manager",
					status: { not: "suspended" },
				},
			});

			if (destManager) {
				throw new APIError(
					"Destination restaurant already has an active manager. Reassignment would violate manager constraints.",
					"delivery.restaurant.assign.manager.ALREADY_HAS_MANAGER",
					undefined,
					409
				);
			}

			if (movingManagers.length > 1) {
				throw new APIError(
					"Multiple active managers are being reassigned to a single destination restaurant. This is not allowed.",
					"delivery.restaurant.assign.manager.MULTIPLE_MANAGERS_NOT_ALLOWED",
					undefined,
					409
				);
			}
		}

		return context.json<APIResponse<{ valid: boolean }>>(
			{
				success: true,
				code: 200,
				data: {
					valid: true,
				},
			},
			{ status: 200 }
		);
	},
);
