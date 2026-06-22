import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reactivateEmployeesRequestBodyValidator } from "medical/validators/employee.validators";
import { type APIResponse } from "@/types/api";
import { reactivateMedicalEmployees } from "@/db/actions/medical/employee.actions";

export const reactivateEmployeesHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	reactivateEmployeesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids, reassign_back_to_departments } = context.req.valid("json");

		const result = await reactivateMedicalEmployees({
			ids,
			client_id,
			reassign_back_to_departments,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Employees reactivated successfully!",
			data: result,
		});
	},
);
