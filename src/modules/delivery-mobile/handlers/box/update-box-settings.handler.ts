import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { updateDriverBoxSettings } from "@/db/actions/delivery-mobile/box.actions.ts";
import {
	boxIdParamValidator,
	updateBoxSettingsBodyValidator,
} from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSettingsUpdateResult } from "@/types/delivery-mobile-box";

export const updateBoxSettingsHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	updateBoxSettingsBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const patch = context.req.valid("json");

		const data = await updateDriverBoxSettings({
			box_id,
			client_id,
			employee_id: user_id,
			patch,
		});

		return context.json<APIResponse<MobileBoxSettingsUpdateResult>>(
			{
				success: true,
				code: 200,
				message: "Box settings updated successfully",
				data,
			},
			{ status: 200 },
		);
	},
);
