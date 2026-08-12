import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { listOwnerBoxes } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/mobile-box";

export const listBoxesHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	async (context) => {
		const client_id = context.get("client_id");
		const data = await listOwnerBoxes(client_id);

		return context.json<APIResponse<MobileBoxSummary[]>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);
