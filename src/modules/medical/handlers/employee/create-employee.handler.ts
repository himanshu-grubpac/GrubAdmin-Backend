import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { createEmployeeRequestBodyValidator } from "medical/validators/employee.validators.ts";
import { createMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { resolveEmployeeName, withFullName } from "@/utils/employee.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";

export const createEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	createEmployeeRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");

		const { first_name, last_name } = resolveEmployeeName({
			full_name: "full_name" in body ? body.full_name : undefined,
			first_name: "first_name" in body ? body.first_name : undefined,
			last_name: "last_name" in body ? body.last_name : undefined,
		});

		const {
			email,
			country_code,
			mobile_number,
			department_id,
			employee_id,
			role,
			joining_date,
		} = body;

		const { client_id } = context.var;

		const employee = await createMedicalEmployee({
			first_name,
			last_name,
			email,
			country_code,
			mobile_number,
			department_id,
			client_id,
			employee_display_id: employee_id,
			role,
			joining_date,
		});

		const { user_id, user, type } = context.var;
		const userObj = user as any;
		const actorName = type === "admin"
			? userObj.name
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Employee",
			type: "Creation",
			actor: {
				id: user_id,
				name: actorName,
				role: type,
				table: type === "admin" ? "client" : "vertical_medical_employee",
			},
			client_id,
			subject: {
				id: employee.id,
				name: withFullName(employee).full_name,
				type: "employee",
			},
			metadata: {
				role: employee.role,
			},
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.employee.create.SUCCESS", { id: employee.id }),
			data: {
				vertical_medical_employee: {
					...withFullName(employee),
					employee_id: (employee as any).employee_display_id,
				} as any,
			},
		};

		return context.json<APIResponse<any>>(
			response,
			response.code as any
		);
	},
);
