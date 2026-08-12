import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getOwnerBoxDetails } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import { boxIdParamValidator } from "@/modules/medical-mobile/owner/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxDetails } from "@/types/mobile-box";

export const getBoxDetailsHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getOwnerBoxDetails({ box_id, client_id });

		return context.json<APIResponse<MobileBoxDetails>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);
