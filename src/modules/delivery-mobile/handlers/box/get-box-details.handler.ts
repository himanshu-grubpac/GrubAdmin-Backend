import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getDriverBoxDetails } from "@/db/actions/delivery-mobile/box.actions.ts";
import { boxIdParamValidator } from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxDetails } from "@/types/delivery-mobile-box";

export const getBoxDetailsHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await getDriverBoxDetails({
			box_display_id: box_id,
			client_id,
			employee_id: user_id,
		});

		return context.json<APIResponse<MobileBoxDetails>>(
			{
				success: true,
				code: 200,
				message: "Box details fetched successfully",
				data,
			},
			{ status: 200 },
		);
	},
);
