import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { suspendEmployeesRequestBodyValidator } from "food/validators/employee.validators";
import { toggleSuspendVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { withFullNames } from "@/utils/employee.ts";

export const suspendEmployeesHandler = createHandlers(
	foodAuthGuard(["manager", "admin"]),
	suspendEmployeesRequestBodyValidator,
	async (context) => {
		const { user, client_id } = context.var;

		const { ids } = context.req.valid("json");

		const { user_id, type } = context.var;

		// Fetch names for logging
		const employeesData = await prisma.vertical_food_employee.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, first_name: true, last_name: true },
		});

		const result = await toggleSuspendVerticalFoodEmployees({
			ids,
			client_id,
			state: "suspended",
		});

		let message = `${result.updated_count} employee${result.updated_count === 1 ? "" : "s"} suspended successfully.`;
		if (result.already_in_state_count > 0) {
			message += ` ${result.already_in_state_count} employee${result.already_in_state_count === 1 ? "" : "s"} ${result.already_in_state_count === 1 ? "was" : "were"} already suspended.`;
		}

		// Log each suspension
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const employees = withFullNames(employeesData as any[]);

		for (const emp of employees) {
			await loggerService.log({
				category: "Employee",
				type: "Suspension",
				actor: {
					id: user_id,
					name: actorName,
					role: type,
					table: type === "admin" ? "client" : "vertical_food_employee",
				},
				client_id,
				subject: {
					id: emp.id,
					name: emp.full_name,
					type: "employee",
				},
			});
		}

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message,
			},
			{
				status: 200,
			},
		);
	},
);

