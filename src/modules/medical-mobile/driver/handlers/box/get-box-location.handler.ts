import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import {
	getHandlerBoxLocation,
	shareHandlerBoxLocation,
	getHandlerBoxDiagnostics,
	getHandlerBoxAlerts,
} from "@/db/actions/medical-mobile/box.actions.ts";
import {
	boxIdParamValidator,
	boxAlertsQueryValidator,
	shareLocationBodyValidator,
} from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

/**
 * GET /boxes/:box_id/location
 * Response: { lat, lng, updated_at, address_hint }
 */
export const getBoxLocationHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getHandlerBoxLocation({
			box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

/**
 * POST /boxes/:box_id/location/share
 * Request: { ttl_minutes?: number } (ignored — native share only)
 * Response: { lat, lng, updated_at, address_hint, gps_status, maps_url, share_text }
 */
export const shareBoxLocationHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	shareLocationBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const { ttl_minutes } = context.req.valid("json");

		const data = await shareHandlerBoxLocation({
			box_id,
			client_id,
			employee_id: user_id,
			ttl_minutes,
		});

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

/**
 * GET /boxes/:box_id/diagnostics
 * Response: nested hardware accordion sections
 */
export const getBoxDiagnosticsHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getHandlerBoxDiagnostics({
			box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

/**
 * GET /boxes/:box_id/alerts
 * Query: ?severity=&from=&to=
 */
export const getBoxAlertsHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	boxAlertsQueryValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const { severity, type, category, from, to } = context.req.valid("query");

		const data = await getHandlerBoxAlerts({
			box_id,
			client_id,
			employee_id: user_id,
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
