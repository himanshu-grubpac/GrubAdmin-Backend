import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { getMedicalEmployees } from "@/db/actions/medical/employee.actions";

export const getEmployeeDropdownsHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { client_id } = context.var;
		const { role, department_id } = context.req.query() as any;

		const employees = await getMedicalEmployees({
			client_id,
			roles: role ? [role] : undefined,
			department_ids: department_id ? [department_id] : undefined,
			fetchAll: true,
		});

		return context.json<APIResponse<typeof employees>>({
			success: true,
			code: 200,
			message: "Employee dropdowns fetched successfully!",
			data: employees,
		});
	},
);
