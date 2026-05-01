import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { deleteEmployeesRequestBodyValidator } from "food/validators/employee.validators.ts";
import { APIError } from "@/types/error";
import { deleteVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { withFullNames } from "@/utils/employee.ts";
import { resolveMessageTemplate } from "@/utils/message";

export const deleteEmployeesHandler = createHandlers(
	foodAuthGuard(
		["manager", "admin"],
		"Your role is not authorized to delete this role.",
	),
	deleteEmployeesRequestBodyValidator,
	async (context) => {
		const { user, client_id, user_id, type } = context.var;

		const { ids } = context.req.valid("json");

		if (ids.includes(user.id)) {
			throw new APIError("You cannot delete yourself!", undefined, undefined, 400);
		}

		// Fetch names for logging
		const employeesData = await prisma.vertical_food_employee.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, first_name: true, last_name: true },
		});

		await deleteVerticalFoodEmployees({
			ids,
			client_id,
		});

		// Log each deletion
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const employees = withFullNames(employeesData as any[]);

		for (const emp of employees) {
			await loggerService.log({
				category: "Employee",
				type: "Deletion",
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

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.common.DELETE_SUCCESS"),
		};

		return context.json<APIResponse>(response, response.code as any);
	},
);

