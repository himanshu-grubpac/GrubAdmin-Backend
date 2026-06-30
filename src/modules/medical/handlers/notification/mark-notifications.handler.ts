import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { markNotificationsRequestBodyValidator } from "medical/validators/notification.validators.ts";
import { markNotifications } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	updated_count: number;
}

export const markNotificationsHandler = createHandlers(
	medicalAuthGuard(),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids, is_read, is_dismissed } = context.req.valid("json");

		const { updated_count } = await markNotifications({
			client_id,
			ids,
			is_read,
			is_dismissed,
		});

		const action = is_dismissed
			? updated_count === 1
				? "1 notification dismissed."
				: `${updated_count} notifications dismissed.`
			: updated_count === 1
				? "1 notification marked as read."
				: `${updated_count} notifications marked as read.`;

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				message: action,
				data: { updated_count },
			},
			{ status: 200 },
		);
	},
);
