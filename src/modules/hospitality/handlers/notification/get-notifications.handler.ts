import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import {
	getNotificationsRequestQueryValidator,
	searchNotificationsRequestBodyValidator,
} from "hospitality/validators/notification.validators.ts";
import {
	getHospitalityNotifications,
	type HospitalityNotificationListItem,
} from "@/db/actions/hospitality-notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	notifications: HospitalityNotificationListItem[];
}

type NotificationListFilters = {
	page?: number;
	limit?: number;
	types?: HospitalityNotificationListItem["type"][];
	floor_ids?: string[];
	box_ids?: string[];
	search?: string;
	is_read?: boolean;
	is_dismissed?: boolean;
};

const buildNotificationListPayload = async (
	client_id: string,
	vertical_id: string,
	filters: NotificationListFilters,
) => {
	const { notifications, count, page: effectivePage, limit: effectiveLimit } =
		await getHospitalityNotifications({
			client_id,
			vertical_id,
			...filters,
		});

	return {
		success: true as const,
		code: 200 as const,
		data: { notifications },
		pagination: calculatePagination(effectivePage, effectiveLimit, count),
	};
};

export const getNotificationsHandler = createHandlers(
	hospitalityAuthGuard(),
	getNotificationsRequestQueryValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const payload = await buildNotificationListPayload(
			client_id,
			vertical_id,
			context.req.valid("query"),
		);
		return context.json<APIResponse<ResponseData>>(payload, { status: 200 });
	},
);

export const searchNotificationsHandler = createHandlers(
	hospitalityAuthGuard(),
	searchNotificationsRequestBodyValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const payload = await buildNotificationListPayload(
			client_id,
			vertical_id,
			context.req.valid("json"),
		);
		return context.json<APIResponse<ResponseData>>(payload, { status: 200 });
	},
);
