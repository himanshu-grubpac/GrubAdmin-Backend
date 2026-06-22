import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { updateMedicalEmployeeById } from "@/db/actions/medical/employee.actions";

export const updateEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const body = await context.req.json();

		const { id, first_name, last_name, country_code, mobile_number, employee_id, joining_date, email, role, department_id } = body;

		if (!id) {
			return context.json<APIResponse<null>>({ success: false, error: "Employee ID is required", code: 400 }, { status: 400 });
		}

		const employee = await updateMedicalEmployeeById({
			id,
			client_id,
			first_name,
			last_name,
			country_code,
			mobile_number,
			employee_display_id: employee_id,
			joining_date: joining_date ? new Date(joining_date) : undefined,
			email,
			role,
			department_id,
		});

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Employee updated successfully!",
			data: employee,
		});
	},
);
