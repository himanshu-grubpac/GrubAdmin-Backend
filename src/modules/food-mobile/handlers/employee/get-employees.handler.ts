import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { getEmployeesRequestQueryValidator } from "food-mobile/validators/employee.validators.ts";
import type { vertical_food_employee } from "@/db/types";
import { getVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	employees: vertical_food_employee[];
	count: number;
}

export const getEmployeesHandler = createHandlers(
	foodAuthGuard(),
	getEmployeesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;

		const { query, status, role, page_size, page_number, restaurant_ids } =
			context.req.valid("query");

		const employeesData = await getVerticalFoodEmployees({
			roles: typeof role === "string" ? [role] : role,
			query,
			status,
			restaurant_ids:
				typeof restaurant_ids === "string"
					? [restaurant_ids]
					: restaurant_ids,
			pageSize: page_size,
			pageNumber: page_number,
			client_id,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					...employeesData,
					employees: employeesData.employees.map((e) => ({
						...e,
						employee_id: (e as any).employee_display_id,
					})) as any,
				},
				pagination: calculatePagination(page_number, page_size, employeesData.count),
			},
			{
				status: 200,
			},
		);
	},
);

