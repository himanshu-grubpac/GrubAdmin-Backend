import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { suspendEmployeesRequestBodyValidator } from "medical/validators/employee.validators";
import { type APIResponse } from "@/types/api";
import { toggleSuspendMedicalEmployees } from "@/db/actions/medical/employee.actions";

export const suspendEmployeesHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	suspendEmployeesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await toggleSuspendMedicalEmployees({
			ids,
			state: "suspended",
			client_id,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Employees suspended successfully!",
			data: result,
		});
	},
);
