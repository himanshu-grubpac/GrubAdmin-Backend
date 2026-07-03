import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { searchFloorsRequestQueryValidator } from "hospitality/validators/floor.validators";
import { searchHospitalityFloors } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	floors: any[];
}

export const searchFloorsHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	searchFloorsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const floors = await searchHospitalityFloors({
			query,
			client_id,
			limit,
			status,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				floors,
			},
		});
	},
);
