import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { markNotificationsRequestBodyValidator } from "hospitality/validators/notification.validators.ts";
import { markNotifications } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import {
	hospitalityRequestMemo,
} from "@/modules/hospitality/utils/hospitality-request-memo";

interface ResponseData {
	updated_count: number;
}

export const markNotificationsHandler = createHandlers(
	hospitalityAuthGuard(),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const { ids, is_read, is_dismissed } = context.req.valid("json");

		const { updated_count } = await markNotifications({
			client_id,
			vertical_id,
			ids,
			is_read,
			is_dismissed,
		});

		if (updated_count > 0 && (is_read || is_dismissed)) {
			hospitalityRequestMemo.invalidatePrefix(
				`notification-unread-count:${client_id}:`,
			);
		}

		const verb = is_dismissed ? "dismissed" : "marked as read";
		const message =
			updated_count === 0
				? `No notifications ${verb}.`
				: updated_count === 1
					? `1 notification ${verb}.`
					: `${updated_count} notifications ${verb}.`;

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				message,
				data: { updated_count },
			},
			{ status: 200 },
		);
	},
);
