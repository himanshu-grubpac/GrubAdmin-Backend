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

export const getReassignmentCandidatesHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	queryValidator,
	async (context) => {
		const { id } = context.req.valid("query");
		const { client_id } = context.var;

		// Verify target restaurant exists first
		const sourceRestaurant = await prisma.restaurant.findUnique({
			where: { id, client_id },
		});

		if (!sourceRestaurant) {
			throw new APIError("Source restaurant not found", "delivery.restaurant.reassign.NOT_FOUND", undefined, 404);
		}

		// Find candidates (active status, same client, excluding the source id)
		const candidates = await prisma.restaurant.findMany({
			where: {
				client_id,
				status: "active",
				id: { not: id },
			},
			select: {
				id: true,
				name: true,
				status: true,
				created_at: true,
				updated_at: true,
				_count: {
					select: {
						restaurant_boxes: true,
						employees: true,
					},
				},
				employees: {
					where: {
						role: "manager",
						status: { not: "suspended" },
					},
					select: {
						id: true,
						first_name: true,
						last_name: true,
					},
				},
			},
		});

		const formattedCandidates = candidates.map((c) => {
			const activeManager = c.employees[0] || null;
			return {
				id: c.id,
				name: c.name,
				status: c.status,
				created_at: c.created_at,
				updated_at: c.updated_at,
				has_manager: activeManager !== null,
				manager_name: activeManager ? `${activeManager.first_name} ${activeManager.last_name}`.trim() : null,
				box_count: c._count.restaurant_boxes,
				employee_count: c._count.employees,
			};
		});

		return context.json<APIResponse<{ candidates: typeof formattedCandidates }>>(
			{
				success: true,
				code: 200,
				data: { candidates: formattedCandidates },
			},
			{ status: 200 },
		);
	},
);
