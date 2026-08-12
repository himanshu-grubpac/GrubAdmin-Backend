import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { markNotificationsRequestBodyValidator } from "@/modules/medical-mobile/owner/validators/notification.validators.ts";
import { markOwnerMobileNotifications } from "@/db/actions/medical-mobile/notification.actions.ts";
import type { APIResponse } from "@/types/api";

export const markNotificationsHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	markNotificationsRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { ids, is_read, is_dismissed } = context.req.valid("json");

		await markOwnerMobileNotifications({
			client_id,
			ids,
			is_read,
			is_dismissed,
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Notifications updated successfully",
			},
			{ status: 200 },
		);
	},
);
