import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { boxIdParamValidator } from "@/modules/camp-consumer/validators/box.validators.ts";
import {
	disconnectConsumerBox,
	resolveConsumerClientId,
} from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxConnectionResult } from "@/types/mobile-box";

export const disconnectBoxHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");

		const data = await disconnectConsumerBox({
			box_id,
			consumer_id: user_id,
			client_id,
		});

		return context.json<APIResponse<MobileBoxConnectionResult>>({
			success: true,
			code: 200,
			data,
		});
	},
);
