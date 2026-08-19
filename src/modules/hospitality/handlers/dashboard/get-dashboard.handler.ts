import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import { getHospitalityDashboardMetrics } from "@/db/actions/hospitality/box.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	is_password_set: boolean;
	has_boxes: boolean;
	floor_count: number;
	employee_count: number;
	active_box_count: number;
	active_cold_chain_count: number;
	temperature_alarm_count: number;
}

export const getDashboardHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { client_id, is_password_set } = context.var;
		const has_boxes = (await prisma.box.count({
			where: {
				client_id,
				status: "active",
				hospitality_floor_boxes: { some: {} },
			},
		})) > 0;
		const metrics = await getHospitalityDashboardMetrics(client_id);

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					is_password_set,
					has_boxes,
					...metrics,
				},
			},
			{ status: 200 },
		);
	},
);
