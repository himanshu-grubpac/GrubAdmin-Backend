import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { registerBoxBodyValidator } from "@/modules/camp-consumer/validators/box.validators.ts";
import {
	registerConsumerBox,
	resolveConsumerClientId,
} from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/mobile-box";

export const registerBoxHandler = createHandlers(
	campingAuthGuard(),
	registerBoxBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { scanned_code } = context.req.valid("json");

		const data = await registerConsumerBox({
			scanned_code,
			consumer_id: user_id,
			client_id,
		});

		return context.json<APIResponse<MobileBoxSummary>>({ success: true, code: 200, data });
	},
);
