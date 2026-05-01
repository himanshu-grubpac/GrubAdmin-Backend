import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { createGrubpacRequestBodyValidator } from "food/validators/box.validators.ts";
import { createVerticalFoodGrubpac } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { box } from "@/db/types";

interface ResponseData {
	box: box;
}

export const createGrubpacHandler = createHandlers(
	foodAuthGuard(),
	createGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const {
			name,
			box_id,
			vehicle_number,
			restaurant_ids,
			blocked_employee_ids,
			access_mode,
		} = context.req.valid("json");

		const box = await createVerticalFoodGrubpac({
			name,
			box_display_id: box_id,
			vehicle_number,
			restaurant_ids,
			blocked_employee_ids,
			client_id,
			vertical_id,
			access_mode,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					box: {
						...box,
						box_id: (box as any).box_display_id,
					} as any,
				},
			},
			{
				status: 200,
			},
		);
	},
);

