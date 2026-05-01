import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { getGrubpacDetailsRequestQueryValidator } from "food/validators/box.validators.ts";
import { getVerticalFoodGrubpacDetails } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const getGrubpacDetailsHandler = createHandlers(
	foodAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id, user_id, type } = context.var;
		const { id, with_permission_for_employee_id } = context.req.valid("query");

		const box = await getVerticalFoodGrubpacDetails({
			id,
			client_id,
			user_id,
			type,
			with_permission_for_employee_id,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.common.FETCH_SUCCESS"),
			message: "Box details fetched successfully",
			data: {
				...box,
				box_id: (box as any).box_display_id,
			},
		};

		return context.json<APIResponse<any>>(response as any, response.code as any);
	},
);

