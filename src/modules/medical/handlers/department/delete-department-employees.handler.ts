import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { removeDepartmentEmployees } from "@/db/actions/medical/department.actions";

export const deleteDepartmentEmployeesHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { id, employee_ids } = await context.req.json();

		if (!id) throw new APIError("Please provide a department id", undefined, undefined, 400);
		if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
			throw new APIError("Please provide at least one employee id", undefined, undefined, 400);
		}

		const result = await removeDepartmentEmployees({ id, client_id, employee_ids });

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Employees removed from department successfully!",
			data: result,
		});
	},
);
