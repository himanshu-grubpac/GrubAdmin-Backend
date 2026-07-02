import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { reassignMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { withFullNames } from "@/utils/employee.ts";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid employee id").array().min(1, "Please provide at least one employee id"),
		department_id: z.string().nullable().optional(),
		Department_id: z.string().nullable().optional(),
	}).transform((data) => ({
		ids: data.ids,
		department_id: data.department_id ?? data.Department_id ?? null,
	})).refine((data) => {
		if (data.department_id === null || data.department_id === "") return true;
		return z.string().ulid().safeParse(data.department_id).success;
	}, {
		message: "Please provide a valid department id",
		path: ["department_id"],
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reassignEmployeeHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	bodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { ids, department_id } = context.req.valid("json");
		const finalDepartmentId = (department_id === null || department_id === "") ? null : department_id;

		const employeesBefore = await prisma.vertical_medical_employee.findMany({
			where: { id: { in: ids }, client_id },
			include: { department: true },
		});

		const newDepartment = finalDepartmentId
			? await prisma.vertical_medical_department.findFirst({ where: { id: finalDepartmentId, client_id } })
			: null;

		const result = await reassignMedicalEmployee({
			ids,
			client_id,
			department_id: finalDepartmentId,
		});

		const updated = result.newly_assigned_count || 0;
		const already = result.already_assigned_count || 0;
		const skipped = result.skipped_count || 0;

		let message = "";
		if (finalDepartmentId) {
			message = `${updated} employee${updated === 1 ? "" : "s"} reassigned successfully.`;
			if (already > 0) {
				message += ` ${already} employee${already === 1 ? "" : "s"} ${already === 1 ? "was" : "were"} already assigned to this department.`;
			}
		} else {
			message = `${updated} employee${updated === 1 ? "" : "s"} unassigned successfully.`;
			if (already > 0) {
				message += ` ${already} employee${already === 1 ? "" : "s"} ${already === 1 ? "was" : "were"} already unassigned.`;
			}
		}

		if (skipped > 0) {
			message += ` ${skipped} manager${skipped === 1 ? "" : "s"} could not be moved due to a manager conflict in the target department.`;
		}

		const userObj = user as any;
		const actorName = type === "admin"
			? userObj.name
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		for (const emp of employeesBefore) {
			if (emp.department_id !== finalDepartmentId) {
				await loggerService.log({
					category: "Employee",
					type: "Reassignment",
					actor: {
						id: user_id,
						name: actorName,
						role: type,
						table: type === "admin" ? "client" : "vertical_medical_employee",
					},
					client_id,
					subject: {
						id: emp.id,
						name: `${emp.first_name} ${emp.last_name || ""}`.trim(),
						type: "employee",
					},
					metadata: {
						old_group: emp.department?.name || "Unassigned",
						new_group: newDepartment?.name || "Unassigned",
					},
				});
			}
		}

		return context.json<
			APIResponse<{
				employees: any[];
			}>
		>(
			{
				success: true,
				code: 200,
				message,
				data: {
					employees: withFullNames(result.employees).map((e) => ({
						...e,
						employee_id: (e as any).employee_display_id,
					})) as any,
				},
			},
			{ status: 200 },
		);
	},
);
