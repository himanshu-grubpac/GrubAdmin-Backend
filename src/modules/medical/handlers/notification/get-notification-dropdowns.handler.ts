import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getMedicalNotificationDropdowns } from "@/db/actions/medical-notification.actions.ts";
import type { APIResponse } from "@/types/api";

export const getNotificationDropdownsHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { client_id } = context.var;

		const dropdowns = await getMedicalNotificationDropdowns(client_id);

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
