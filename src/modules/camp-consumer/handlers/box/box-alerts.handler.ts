import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	boxIdParamValidator,
	boxAlertsQueryValidator,
	patchBoxAlertsBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import {
	getConsumerBoxAlerts,
	markCampingConsumerNotifications,
} from "@/db/actions/camp-consumer/notification.actions.ts";
import type { APIResponse } from "@/types/api";

/**
 * GET /boxes/:box_id/alerts
 * Query: ?severity=&from=&to=
 */
export const getBoxAlertsHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	boxAlertsQueryValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const { severity, type, category, from, to } = context.req.valid("query");

		const data = await getConsumerBoxAlerts({
			box_id,
			client_id,
			consumer_id: user_id,
			severity,
			type,
			category,
			from,
			to,
		});

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

/**
 * PATCH /boxes/:box_id/alerts
 * Body: { ids, read?, dismissed? } — maps to notification dismiss/read.
 */
export const patchBoxAlertsHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	patchBoxAlertsBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const { ids, read, dismissed } = context.req.valid("json");

		await getConsumerBoxAlerts({
			box_id,
			client_id,
			consumer_id: user_id,
		});

		await markCampingConsumerNotifications({
			client_id,
			consumer_id: user_id,
			ids,
			is_read: read,
			is_dismissed: dismissed,
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Alerts updated successfully",
			},
			{ status: 200 },
		);
	},
);
