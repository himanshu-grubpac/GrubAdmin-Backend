import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getMedicalEmployeeBoxes, getMedicalDashboardMetrics } from "@/db/actions/medical/box.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	is_password_set: boolean;
	has_boxes: boolean;
	department_count: number;
	employee_count: number;
	active_box_count: number;
	active_cold_chain_count: number;
	temperature_alarm_count: number;
}

export const getDashboardHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { user, client_id } = context.var;

		const is_password_set = !!user.password;
		const boxes = await getMedicalEmployeeBoxes(user.id);
		const has_boxes = boxes.length > 0;
		const metrics = await getMedicalDashboardMetrics(client_id);

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
