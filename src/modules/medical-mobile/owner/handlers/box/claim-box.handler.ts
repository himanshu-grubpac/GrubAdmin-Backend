import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { claimOwnerBox } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import { claimBoxBodyValidator } from "@/modules/medical-mobile/owner/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/mobile-box";

export const claimBoxHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	claimBoxBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const body = context.req.valid("json");

		const data = await claimOwnerBox({
			display_id: body.display_id,
			box_display_id: body.box_display_id,
			client_id,
		});

		return context.json<APIResponse<MobileBoxSummary>>(
			{
				success: true,
				code: 200,
				message: "Box claimed successfully",
				data,
			},
			{ status: 200 },
		);
	},
);
