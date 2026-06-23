import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reassignBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import { reassignBoxesToFloor } from "@/db/actions/hospitality/box.actions.ts";

export const reassignGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	reassignBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { box_ids, destination_floor_id, room } = context.req.valid("json");

		const result = await reassignBoxesToFloor({
			box_ids,
			destination_floor_id,
			room,
			client_id,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Boxes reassigned successfully!",
			data: result,
		});
	},
);
