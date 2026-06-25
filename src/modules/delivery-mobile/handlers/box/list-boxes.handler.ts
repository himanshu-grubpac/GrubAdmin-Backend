import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { listDriverBoxes } from "@/db/actions/delivery-mobile/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/delivery-mobile-box";

export const listBoxesHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const data = await listDriverBoxes(user_id, client_id);

		return context.json<APIResponse<MobileBoxSummary[]>>(
			{
				success: true,
				code: 200,
				data,
			},
			{ status: 200 },
		);
	},
);
