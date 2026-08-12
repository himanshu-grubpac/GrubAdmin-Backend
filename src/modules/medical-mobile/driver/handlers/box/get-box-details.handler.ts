import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { getHandlerBoxDetails } from "@/db/actions/medical-mobile/box.actions.ts";
import { boxIdParamValidator } from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxDetails } from "@/types/mobile-box";

export const getBoxDetailsHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getHandlerBoxDetails({
			box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<MobileBoxDetails>>(
			{ success: true, code: 200, data },
			{ status: 200 },
		);
	},
);
