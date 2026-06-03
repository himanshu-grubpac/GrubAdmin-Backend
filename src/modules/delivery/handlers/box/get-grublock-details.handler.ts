import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getGrubpacDetailsRequestQueryValidator } from "delivery/validators/box.validators.ts";
import { getVerticalDeliveryGrubpacDetails } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const getGrublockDetailsHandler = createHandlers(
	deliveryAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id, user_id, type } = context.var;
		const { id } = context.req.valid("query");

		const box = await getVerticalDeliveryGrubpacDetails({
			id,
			client_id,
			user_id,
			type,
		});

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				message: "Grublock details fetched successfully",
				data: {
					...box,
					box_id: (box as any).box_display_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);

