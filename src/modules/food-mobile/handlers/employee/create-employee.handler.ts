import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { createEmployeeRequestBodyValidator } from "food-mobile/validators/employee.validators.ts";
import type { vertical_food_employee } from "@/db/types";
import { createVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	vertical_food_employee: vertical_food_employee;
}

export const createEmployeeHandler = createHandlers(
	foodAuthGuard(["admin", "manager"]),
	createEmployeeRequestBodyValidator,
	async (context) => {
		const {
			email,
			country_code,
			mobile_number,
			restaurant_id,
			first_name,
			last_name,
			employee_id,
			role,
			joining_date,
		} = context.req.valid("json");

		const { user, type } = context.var;

		const { client_id } = context.var;

		const employee = await createVerticalFoodEmployee({
			first_name,
			last_name,
			email,
			country_code,
			mobile_number,
			restaurant_id,
			client_id,
			employee_display_id: employee_id,
			role,
			joining_date,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					vertical_food_employee: {
						...employee,
						employee_id: (employee as any).employee_display_id,
					} as any,
				},
			},
			{
				status: 200,
			},
		);
	},
);

