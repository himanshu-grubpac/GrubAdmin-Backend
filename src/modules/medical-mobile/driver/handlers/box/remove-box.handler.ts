import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { unlinkHandlerBox } from "@/db/actions/medical-mobile/box.actions.ts";
import { boxIdParamValidator } from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const removeBoxHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		await unlinkHandlerBox({ box_id, client_id, employee_id: user_id });

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Box removed successfully",
			},
			{ status: 200 },
		);
	},
);
