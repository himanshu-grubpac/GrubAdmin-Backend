import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getFloorDetailsQueryValidator } from "hospitality/validators/floor.validators";
import { getFloorById } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	floor: any;
}

export const getFloorByIdHandler = createHandlers(
	hospitalityAuthGuard(),
	getFloorDetailsQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("query");

		const floor = await getFloorById({
			id,
			client_id,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				floor,
			},
		});
	},
);
