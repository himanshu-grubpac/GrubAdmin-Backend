import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getGrubpacDetailsRequestQueryValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { getMedicalBoxDetails } from "@/db/actions/medical/box.actions";

export const getGrubpacDetailsHandler = createHandlers(
	medicalAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id, with_permission_for_employee_id } = context.req.valid("query");

		const box = await getMedicalBoxDetails({ id, client_id, with_permission_for_employee_id });

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Box details fetched successfully!",
			data: box,
		});
	},
);
