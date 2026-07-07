import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { markNotificationsRequestBodyValidator } from "camping/validators/notification.validators";
import { markCampingNotificationsAsRead } from "@/db/actions/camping/notification.actions";
import type { APIResponse } from "@/types/api";

export const markNotificationsHandler = createHandlers(
	campingAuthGuard(),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { notification_ids } = context.req.valid("json");

		await markCampingNotificationsAsRead(notification_ids, client_id);

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Notifications marked as read",
			data: null,
		});
	},
);
