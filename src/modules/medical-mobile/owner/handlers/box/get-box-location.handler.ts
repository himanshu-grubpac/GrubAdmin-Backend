import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import {
	getOwnerBoxLocation,
	shareOwnerBoxLocation,
	getOwnerBoxDiagnostics,
	getOwnerBoxAlerts,
} from "@/db/actions/medical-mobile/owner-box.actions.ts";
import {
	boxIdParamValidator,
	boxAlertsQueryValidator,
	shareLocationBodyValidator,
} from "@/modules/medical-mobile/owner/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const getBoxLocationHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getOwnerBoxLocation({ box_id, client_id });

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

export const shareBoxLocationHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	shareLocationBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const { ttl_minutes } = context.req.valid("json");

		const data = await shareOwnerBoxLocation({
			box_id,
			client_id,
			ttl_minutes,
		});

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

export const getBoxDiagnosticsHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getOwnerBoxDiagnostics({ box_id, client_id });

		return context.json<APIResponse<typeof data>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);

export const getBoxAlertsHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	boxAlertsQueryValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const { severity, type, category, from, to } = context.req.valid("query");

		const data = await getOwnerBoxAlerts({
			box_id,
			client_id,
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
