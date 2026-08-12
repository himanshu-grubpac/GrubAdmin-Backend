import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { disconnectHandlerBox } from "@/db/actions/medical-mobile/box.actions.ts";
import { boxIdParamValidator } from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxConnectionResult } from "@/types/mobile-box";

export const disconnectBoxHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await disconnectHandlerBox({
			box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<MobileBoxConnectionResult>>(
			{
				success: true,
				code: 200,
				message: "Box disconnected successfully",
				data,
			},
			{ status: 200 },
		);
	},
);
