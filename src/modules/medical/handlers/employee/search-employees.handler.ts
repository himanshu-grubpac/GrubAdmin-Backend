import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { searchMedicalEmployees } from "@/db/actions/medical/employee.actions";

export const searchEmployeesHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status, department_id } = context.req.query() as any;

		const employees = await searchMedicalEmployees({ query, client_id, limit: limit ? Number(limit) : undefined, status, department_id });

		return context.json<APIResponse<typeof employees>>({
			success: true,
			code: 200,
			message: "Employees fetched successfully!",
			data: employees,
		});
	},
);
