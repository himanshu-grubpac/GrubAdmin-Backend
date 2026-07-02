import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { markNotificationsRequestBodyValidator } from "@/modules/delivery-mobile/validators/notification.validators.ts";
import { markDeliveryNotifications } from "@/db/actions/delivery-mobile/notification.actions.ts";

export const markNotificationsHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { ids, is_dismissed, is_read } = context.req.valid("json");

		await markDeliveryNotifications({
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
