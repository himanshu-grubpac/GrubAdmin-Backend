import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { assignEmployeesRequestBodyValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { assignEmployeesToDepartment } from "@/db/actions/medical/department.actions";

export const assignEmployeesHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	assignEmployeesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id, employee_ids, role } = context.req.valid("json");
		const prismaRole = role === "delivery" ? "handler" : role;

		const result = await assignEmployeesToDepartment({
			department_id: id,
			employee_ids,
			role: prismaRole,
			client_id,
		});

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Employees assigned successfully!",
			data: result,
		});
	},
);
