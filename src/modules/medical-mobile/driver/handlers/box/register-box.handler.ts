import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { registerHandlerBox } from "@/db/actions/medical-mobile/box.actions.ts";
import { registerBoxBodyValidator } from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/mobile-box";

export const registerBoxHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	registerBoxBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { scanned_code } = context.req.valid("json");

		const data = await registerHandlerBox({
			scanned_code,
			employee_id: user_id,
			client_id,
		});

		return context.json<APIResponse<MobileBoxSummary>>(
			{
				success: true,
				code: 201,
				message: "Box registered successfully",
				data,
			},
			{ status: 201 },
		);
	},
);
