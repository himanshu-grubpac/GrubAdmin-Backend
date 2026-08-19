import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getAdminNotificationsRequestQueryValidators } from "@/modules/admin/validators/notification.validators.ts";
import type { AdminNotificationModel } from "@/db/mongo-schema";
import { getAdminNotifications } from "@/db/actions/admin-notification.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	notifications: AdminNotificationModel[];
}

export const getAdminNotificationsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getAdminNotificationsRequestQueryValidators,
	async (context) => {
		const { query, type, status, page, limit } = context.req.valid("query");
		const { admin } = context.var;

		const {
			notifications,
			count,
			page: effectivePage,
			limit: effectiveLimit,
		} = await getAdminNotifications({
			query,
			type,
			status,
			page,
			limit,
			userId: admin?.id ?? "",
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					notifications,
				},
				pagination: calculatePagination(
					effectivePage,
					effectiveLimit,
					count,
				),
			},
			{
				status: 200,
			},
		);
	},
);
