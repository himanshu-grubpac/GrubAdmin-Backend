import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getNotificationsRequestQueryValidator } from "hospitality/validators/notification.validators.ts";
import { getHospitalityNotifications } from "@/db/actions/hospitality-notification.actions.ts";
import type { APIResponse } from "@/types/api";
import type { notification } from "@/db/types";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	notifications: notification[];
	count: number;
	unread_count: number;
}

export const getNotificationsHandler = createHandlers(
	hospitalityAuthGuard(),
	getNotificationsRequestQueryValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const { page, limit, types, floor_ids, box_ids, search, is_read, is_dismissed } =
			context.req.valid("query");

		const { notifications, count, unread_count } = await getHospitalityNotifications({
			client_id,
			vertical_id,
			page,
			limit,
			types,
			floor_ids,
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
