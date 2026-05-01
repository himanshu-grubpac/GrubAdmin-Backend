import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { reactivateEmployeesRequestBodyValidator } from "food-mobile/validators/employee.validators.ts";
import { APIError } from "@/types/error";
import { toggleSuspendVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";

export const reactivateEmployeesHandler = createHandlers(
	foodAuthGuard(["manager", "admin"]),
	reactivateEmployeesRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;

		const { ids } = context.req.valid("json");

		const client_id =
			type === "admin"
				? user.id
				: (user as { client_id: string }).client_id;

		if (ids.includes(user.id)) {
			throw new APIError("You cannot reactivate yourself!", undefined, undefined, 400);
		}

		await toggleSuspendVerticalFoodEmployees({
			ids,
			client_id,
			state: "active",
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);

