import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	listConsumerBoxes,
	resolveConsumerClientId,
} from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/mobile-box";

export const listBoxesHandler = createHandlers(campingAuthGuard(), async (context) => {
	const user_id = context.get("user_id");
	const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
	const data = await listConsumerBoxes(user_id, client_id);

	return context.json<APIResponse<MobileBoxSummary[]>>({ success: true, code: 200, data });
});
