import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getGrubpacDetailsRequestQueryValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { getMedicalGrubpacEditDetails } from "@/db/actions/medical/box.actions";

export const getGrubpacEditDetailsHandler = createHandlers(
	medicalAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("query");

		const data = await getMedicalGrubpacEditDetails({ id, client_id });

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Edit details fetched successfully!",
			data,
		});
	},
);
