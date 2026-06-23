import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getNotificationsRequestQueryValidator } from "medical/validators/notification.validators.ts";
import { getMedicalNotifications } from "@/db/actions/medical-notification.actions.ts";
import type { APIResponse } from "@/types/api";
import type { notification } from "@/db/types";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	notifications: notification[];
	count: number;
	unread_count: number;
}

export const getNotificationsHandler = createHandlers(
	medicalAuthGuard(),
	getNotificationsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { page, limit, types, department_ids, box_ids, search, is_read, is_dismissed } =
			context.req.valid("query");

		const { notifications, count, unread_count } = await getMedicalNotifications({
			client_id,
			page,
			limit,
			types,
			department_ids,
			box_ids,
			search,
			is_read,
			is_dismissed,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					notifications,
					count,
					unread_count,
				},
				pagination: limit ? calculatePagination(page ?? 1, limit, count) : undefined,
			},
			{ status: 200 },
		);
	},
);
