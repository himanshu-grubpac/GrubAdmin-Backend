import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getFloorsRequestQueryValidator } from "hospitality/validators/floor.validators";
import { getFloors } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	floors: any[];
	count: number;
}

export const getFloorsHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	getFloorsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, status, page, limit, include_boxes } = context.req.valid("query");

		const { floors, count } = await getFloors({
			query,
			status: status || undefined,
			page_size: limit,
			page_number: page,
			client_id,
			include_boxes,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				floors,
				count,
			},
		});
	},
);
