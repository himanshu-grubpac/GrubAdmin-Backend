import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

/**
 * Counts of suspended employees for activate-all / summary modals.
 * GET /delivery/employee/suspended/summary
 */
export const getEmployeeSuspendedSummaryHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	async (context) => {
		const { client_id } = context.var;

		const [managers, drivers, total] = await Promise.all([
			prisma.vertical_delivery_employee.count({
				where: { client_id, status: "suspended", role: "manager" },
			}),
			prisma.vertical_delivery_employee.count({
				where: { client_id, status: "suspended", role: "delivery" },
			}),
			prisma.vertical_delivery_employee.count({
				where: { client_id, status: "suspended" },
			}),
		]);

		return context.json<
			APIResponse<{ managers: number; drivers: number; total: number }>
		>(
			{
				success: true,
				code: 200,
				data: { managers, drivers, total },
			},
			{ status: 200 },
		);
	},
);
