import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

/**
 * Aggregate of suspended GrubPacs for activate-all / summary modals.
 * GET /delivery/grubpac/suspended/summary
 */
export const getGrubpacSuspendedSummaryHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	async (context) => {
		const { client_id } = context.var;

		const [boxes, firstBox, assignedCount] = await Promise.all([
			prisma.box.count({
				where: { client_id, status: "suspended" },
			}),
			prisma.box.findFirst({
				where: { client_id, status: "suspended" },
				orderBy: { updated_at: "desc" },
				select: { name: true, box_display_id: true },
			}),
			prisma.box.count({
				where: {
					client_id,
					status: "suspended",
					restaurant_boxes: { some: {} },
				},
			}),
		]);

		const first_box_name =
			firstBox?.name?.trim() || firstBox?.box_display_id || "";

		return context.json<
			APIResponse<{
				boxes: number;
				first_box_name: string;
				has_restaurant_assignments: boolean;
			}>
		>(
			{
				success: true,
				code: 200,
				data: {
					boxes,
					first_box_name,
					has_restaurant_assignments: assignedCount > 0,
				},
			},
			{ status: 200 },
		);
	},
);
