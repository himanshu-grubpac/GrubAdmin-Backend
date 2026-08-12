import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { markNotificationsRequestBodyValidator } from "@/modules/camp-consumer/validators/notification.validators.ts";
import { markCampingConsumerNotifications } from "@/db/actions/camp-consumer/notification.actions.ts";
import type { APIResponse } from "@/types/api";

export const markNotificationsHandler = createHandlers(
	campingAuthGuard(),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { ids, is_read, is_dismissed } = context.req.valid("json");

		await markCampingConsumerNotifications({
			client_id,
			consumer_id: user_id,
			ids,
			is_read,
			is_dismissed,
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Notifications updated successfully",
			},
			{ status: 200 },
		);
	},
);
