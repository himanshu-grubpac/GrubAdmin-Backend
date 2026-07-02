import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getHospitalityNotificationDropdowns } from "@/db/actions/hospitality-notification.actions.ts";
import type { APIResponse } from "@/types/api";

export const getNotificationDropdownsHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { client_id, vertical_id } = context.var;

		const dropdowns = await getHospitalityNotificationDropdowns(client_id, vertical_id);

		return context.json<APIResponse<typeof dropdowns>>(
			{
				success: true,
				code: 200,
				data: dropdowns,
				message: "Notification dropdowns fetched successfully",
			},
			{ status: 200 },
		);
	},
);
