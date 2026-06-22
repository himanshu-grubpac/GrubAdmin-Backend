import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reassignBoxesRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { reassignBoxesToDepartment } from "@/db/actions/medical/box.actions";

export const reassignGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	reassignBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { box_ids, destination_department_id } = context.req.valid("json");

		const result = await reassignBoxesToDepartment({
			box_ids,
			destination_department_id,
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
