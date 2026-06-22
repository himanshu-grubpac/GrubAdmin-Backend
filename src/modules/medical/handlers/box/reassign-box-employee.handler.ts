import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reassignBoxEmployeeRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { assignMedicalBoxToEmployee } from "@/db/actions/medical/box.actions";

export const reassignBoxEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	reassignBoxEmployeeRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { box_ids, employee_ids } = context.req.valid("json");

		const result = await assignMedicalBoxToEmployee({
			box_ids,
			employee_ids,
			client_id,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Box-employee assignment updated successfully!",
			data: result,
		});
	},
);
