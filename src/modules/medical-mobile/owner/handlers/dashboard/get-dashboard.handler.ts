import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getOwnerDashboard } from "@/db/actions/medical-mobile/owner-dashboard.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MedicalOwnerDashboardData } from "@/types/medical-mobile/owner-dashboard";
import type { client } from "@/db/types";
import { getOwnerDisplayName } from "@/modules/medical-mobile/owner/handlers/auth/auth.utils.ts";

export const getDashboardHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	async (context) => {
		const client_id = context.get("client_id");
		const user = context.get("user") as client;

		const data = await getOwnerDashboard({
			client_id,
			owner_name: getOwnerDisplayName(user),
			password: user.password,
		});

		return context.json<APIResponse<MedicalOwnerDashboardData>>(
			{
				success: true,
				code: 200,
				data,
			},
			{ status: 200 },
		);
	},
);
