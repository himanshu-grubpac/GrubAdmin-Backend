import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getHandlerDashboard } from "@/db/actions/medical-mobile/dashboard.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MedicalMobileDashboardData } from "@/types/medical-mobile/dashboard";
import type { vertical_medical_employee } from "@/db/types";

export const getDashboardHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as vertical_medical_employee;

		const data = await getHandlerDashboard({
			employee_id: user_id,
			client_id,
			first_name: user.first_name,
			password: user.password,
		});

		return context.json<APIResponse<MedicalMobileDashboardData>>(
			{
				success: true,
				code: 200,
				data,
			},
			{ status: 200 },
		);
	},
);
