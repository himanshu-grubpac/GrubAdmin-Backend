import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { createEmployeeRequestBodyValidator } from "delivery-mobile/validators/employee.validators.ts";
import type { vertical_delivery_employee } from "@/db/types";
import { createVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	vertical_delivery_employee: vertical_delivery_employee;
}

export const createEmployeeHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
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

		const employee = await createVerticalDeliveryEmployee({
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
					vertical_delivery_employee: {
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

