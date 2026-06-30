import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { reassignMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid employee id").array().min(1, "Please provide at least one employee id"),
		department_id: z.string().ulid("Please provide a valid department id").nullable().optional(),
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
		const { client_id } = context.var;
		const { ids, department_id } = context.req.valid("json");
		const finalDepartmentId = department_id ?? null;

		const result = await reassignMedicalEmployee({
			ids,
			client_id,
			department_id: finalDepartmentId,
		});

		const updated = result.newly_assigned_count || 0;
		const already = result.already_assigned_count || 0;

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

		const skipped = result.skipped_count || 0;
		if (skipped > 0) {
			message += ` ${skipped} manager${skipped === 1 ? "" : "s"} could not be moved due to a manager conflict in the target department.`;
		}

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message,
			data: result,
		});
	},
);
