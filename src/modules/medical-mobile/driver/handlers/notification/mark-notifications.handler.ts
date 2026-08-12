import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { markNotificationsRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/notification.validators.ts";
import { markMedicalMobileNotifications } from "@/db/actions/medical-mobile/notification.actions.ts";

export const markNotificationsHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { ids, is_dismissed, is_read } = context.req.valid("json");

		await markMedicalMobileNotifications({
			client_id,
			employee_id: user_id,
			ids,
			is_dismissed,
			is_read,
		});

		return context.json(
			{
				success: true,
				code: 200,
				message: "Notifications updated successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
