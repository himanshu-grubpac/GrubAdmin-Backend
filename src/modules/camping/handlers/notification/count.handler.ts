import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { getCampingUnreadNotificationCount } from "@/db/actions/camping/notification.actions";
import type { APIResponse } from "@/types/api";

export const getUnreadNotificationsCountHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");

		const count = await getCampingUnreadNotificationCount(client_id, vertical_id);

		return context.json<APIResponse<{ count: number }>>({
			success: true,
			code: 200,
			data: { count },
		});
	},
);
