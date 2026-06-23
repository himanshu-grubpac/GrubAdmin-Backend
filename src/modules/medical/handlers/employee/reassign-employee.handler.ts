import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { reassignMedicalEmployee } from "@/db/actions/medical/employee.actions";

export const reassignEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { ids, department_id } = await context.req.json();

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return context.json<APIResponse<null>>({ success: false, error: "Please provide at least one employee id", code: 400 }, { status: 400 });
		}

		const result = await reassignMedicalEmployee({
			ids,
			client_id,
			department_id: department_id ?? null,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Employee reassigned successfully!",
			data: result,
		});
	},
);
