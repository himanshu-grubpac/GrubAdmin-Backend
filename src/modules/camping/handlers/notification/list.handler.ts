import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { getNotificationsQueryValidator } from "camping/validators/notification.validators";
import { getCampingNotifications } from "@/db/actions/camping/notification.actions";
import type { APIResponse } from "@/types/api";

export const getNotificationsHandler = createHandlers(
	campingAuthGuard(),
	getNotificationsQueryValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");
		const query = context.req.valid("query");

		const result = await getCampingNotifications({
			client_id,
			vertical_id,
			...query,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			data: result,
		});
	},
);
