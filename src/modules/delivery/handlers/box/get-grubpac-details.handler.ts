import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getGrubpacDetailsRequestQueryValidator } from "delivery/validators/box.validators.ts";
import { getVerticalDeliveryGrubpacDetails } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const getGrubpacDetailsHandler = createHandlers(
	deliveryAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id, user_id, type } = context.var;
		const { id, with_permission_for_employee_id } = context.req.valid("query");

		const box = await getVerticalDeliveryGrubpacDetails({
			id,
			client_id,
			user_id,
			type,
			with_permission_for_employee_id,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
			message: "Box details fetched successfully",
			data: {
				...box,
				box_id: (box as any).box_display_id,
			},
		};

		return context.json<APIResponse<any>>(response as any, response.code as any);
	},
);

