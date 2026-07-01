import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { deleteEmployeesRequestBodyValidator } from "medical/validators/employee.validators";
import { APIError } from "@/types/error";
import { deleteMedicalEmployees } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { withFullNames } from "@/utils/employee.ts";
import { resolveMessageTemplate } from "@/utils/message";

export const deleteEmployeesHandler = createHandlers(
	medicalAuthGuard(
		["admin", "manager"],
		"Your role is not authorized to delete employees.",
	),
	deleteEmployeesRequestBodyValidator,
	async (context) => {
		const { user, client_id, user_id, type } = context.var;

		const { ids } = context.req.valid("json");

		if (ids.includes(user.id)) {
			throw new APIError("You cannot delete yourself!", undefined, undefined, 400);
		}

		const employeesData = await prisma.vertical_medical_employee.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, first_name: true, last_name: true },
		});

		if (employeesData.length !== ids.length) {
			throw new APIError("One or more employee IDs are invalid or unauthorized", undefined, undefined, 403);
		}

		await deleteMedicalEmployees({
			ids,
			client_id,
		});

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

		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.common.DELETE_SUCCESS"),
		};

		return context.json<APIResponse>(response, response.code as any);
	},
);
