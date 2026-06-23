import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getGrubpacDetailsRequestQueryValidator } from "hospitality/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import { getHospitalityBoxDetails } from "@/db/actions/hospitality/box.actions.ts";

export const getGrubpacDetailsHandler = createHandlers(
	hospitalityAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("query");

		const box = await getHospitalityBoxDetails({ id, client_id });

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Box details fetched successfully!",
			data: box,
		});
	},
);
