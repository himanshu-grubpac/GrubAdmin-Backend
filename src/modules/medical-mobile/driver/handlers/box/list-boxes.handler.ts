import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { listHandlerBoxes } from "@/db/actions/medical-mobile/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/mobile-box";

export const listBoxesHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const data = await listHandlerBoxes(user_id, client_id);

		return context.json<APIResponse<MobileBoxSummary[]>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);
