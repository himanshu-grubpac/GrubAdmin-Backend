import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { updateHandlerBoxSettings } from "@/db/actions/medical-mobile/box.actions.ts";
import {
	boxIdParamValidator,
	updateBoxSettingsBodyValidator,
} from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSettingsUpdateResult } from "@/types/mobile-box";

export const updateBoxSettingsHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	updateBoxSettingsBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");
		const patch = context.req.valid("json");

		const data = await updateHandlerBoxSettings({
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
