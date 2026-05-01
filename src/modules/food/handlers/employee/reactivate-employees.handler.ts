import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { reactivateEmployeesRequestBodyValidator } from "food/validators/employee.validators.ts";
import { reactivateVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { withFullNames } from "@/utils/employee.ts";
import { APIError } from "@/types/error";

export const reactivateEmployeesHandler = createHandlers(
	foodAuthGuard(["manager", "admin"]),
	reactivateEmployeesRequestBodyValidator,
	async (context) => {
		const { user, client_id, user_id, type } = context.var;
		const { ids, reassign_back_to_restaurants } = context.req.valid("json");

		// Fetch names for logging
		const employeesData = await prisma.vertical_food_employee.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, first_name: true, last_name: true, status: true },
		});

		const result = await reactivateVerticalFoodEmployees({
			ids,
			client_id,
			reassign_back_to_restaurants,
		});

		const updated = result.updated_count || 0;
		const already = result.already_active_count || 0;
		const skipped = result.skipped_managers_count || 0;

		let message = `${updated} employee${updated === 1 ? "" : "s"} reactivated successfully.`;
		if (already > 0) {
			message += ` ${already} employee${already === 1 ? "" : "s"} ${already === 1 ? "was" : "were"} already active.`;
		}
		if (skipped > 0) {
			message += ` ${skipped} manager${skipped === 1 ? "" : "s"} could not be reassigned due to conflicts.`;
			
			// If all requested employees were skipped managers
			if (updated === 0) {
				throw new APIError(
					message,
					"food.restaurant.assign.manager.ACTIVATION_CONFLICT",
					{ skipped_count: skipped }
				);
			}
		}

		// Log each activation
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const employeesToLog = withFullNames(employeesData as any[]);

		for (const emp of employeesToLog) {
			// Only log if it actually changed (was not active before)
			if (emp.status !== "active") {
				await loggerService.log({
					category: "Employee",
					type: "Activation",
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

