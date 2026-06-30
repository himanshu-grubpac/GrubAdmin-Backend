import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { connectDriverBox } from "@/db/actions/delivery-mobile/box.actions.ts";
import { boxIdParamValidator } from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const connectBoxHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await connectDriverBox({
			box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<typeof data>>(
			{
				success: true,
				code: 200,
				message: "Box connected successfully",
				data,
			},
			{ status: 200 },
		);
	},
);
