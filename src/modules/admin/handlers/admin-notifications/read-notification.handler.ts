import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { readNotificationsRequestBodyValidators } from "@/modules/admin/validators/notification.validators.ts";
import { readAdminNotification } from "@/db/actions/admin-notification.action.ts";
import type { APIResponse } from "@/types/api";

export const readNotificationHandler = createHandlers(
	authGuard(["admin", "employee"]),
	readNotificationsRequestBodyValidators,
	async (context) => {
		const { ids } = context.req.valid("json");
		const { admin } = context.var;

		const t = await readAdminNotification({
			ids,
			recipientId: admin?.id ?? "",
		});

		console.log(t);

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
