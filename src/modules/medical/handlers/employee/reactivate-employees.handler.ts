import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reactivateEmployeesRequestBodyValidator } from "medical/validators/employee.validators";
import { reactivateMedicalEmployees } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { withFullNames } from "@/utils/employee.ts";
import { APIError } from "@/types/error";

export const reactivateEmployeesHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	reactivateEmployeesRequestBodyValidator,
	async (context) => {
		const { user, client_id, user_id, type } = context.var;
		const { ids, reassign_back_to_departments } = context.req.valid("json");

		const employeesData = await prisma.vertical_medical_employee.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, first_name: true, last_name: true, status: true },
		});

		if (employeesData.length !== ids.length) {
			throw new APIError("One or more employee IDs are invalid or unauthorized", undefined, undefined, 403);
		}

		const result = await reactivateMedicalEmployees({
			ids,
			client_id,
			reassign_back_to_departments,
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

			if (updated === 0) {
				throw new APIError(
					message,
					"medical.department.assign.manager.ACTIVATION_CONFLICT",
					{ skipped_count: skipped },
				);
			}
		}

		const userObj = user as any;
		const actorName = type === "admin"
			? userObj.name
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const employeesToLog = withFullNames(employeesData as any[]);

		for (const emp of employeesToLog) {
			if (emp.status !== "active") {
				await loggerService.log({
					category: "Employee",
					type: "Activation",
					actor: {
						id: user_id,
						name: actorName,
						role: type,
						table: type === "admin" ? "client" : "vertical_medical_employee",
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
