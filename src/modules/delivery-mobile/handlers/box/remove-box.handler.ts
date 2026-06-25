import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { unlinkDriverBox } from "@/db/actions/delivery-mobile/box.actions.ts";
import { boxIdParamValidator } from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const removeBoxHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		await unlinkDriverBox({
			box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: "Box unlinked successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
