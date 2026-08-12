import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	boxIdParamValidator,
	updateBoxSettingsBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import {
	resolveConsumerClientId,
	updateConsumerBoxSettings,
} from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSettingsUpdateResult } from "@/types/mobile-box";

export const updateBoxSettingsHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	updateBoxSettingsBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");
		const patch = context.req.valid("json");

		const data = await updateConsumerBoxSettings({
			box_id,
			consumer_id: user_id,
			client_id,
			patch,
		});

		return context.json<APIResponse<MobileBoxSettingsUpdateResult>>({
			success: true,
			code: 200,
			data,
		});
	},
);
