import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getAdminNotificationsRequestQueryValidators } from "@/modules/admin/validators/notification.validators.ts";
import type { AdminNotificationModel } from "@/db/mongo-schema";
import { getAdminNotifications } from "@/db/actions/admin-notification.action.ts";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	notifications: AdminNotificationModel[];
}

export const getAdminNotificationsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getAdminNotificationsRequestQueryValidators,
	async (context) => {
		const { query, type, status, minified } = context.req.valid("query");
		const { admin } = context.var;

		const notifications = await getAdminNotifications({
			query,
			type: typeof type === "string" ? [type] : type,
			status: typeof status === "string" ? [status] : status,
			minified,
			userId: admin?.id ?? "",
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					notifications,
				},
			},
			{
				status: 200,
			},
		);
	},
);
