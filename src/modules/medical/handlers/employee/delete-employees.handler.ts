import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { deleteEmployeesRequestBodyValidator } from "medical/validators/employee.validators";
import { type APIResponse } from "@/types/api";
import { deleteMedicalEmployees } from "@/db/actions/medical/employee.actions";

export const deleteEmployeesHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	deleteEmployeesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await deleteMedicalEmployees({ ids, client_id });

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Employees deleted successfully!",
			data: result,
		});
	},
);
