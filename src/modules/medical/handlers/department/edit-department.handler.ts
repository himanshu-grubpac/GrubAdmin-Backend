import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { editDepartmentRequestBodyValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { updateDepartment } from "@/db/actions/medical/department.actions";
import { resolveMessageTemplate } from "@/utils/message";

export const editDepartmentHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	editDepartmentRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id, name, status } = context.req.valid("json");

		const department = await updateDepartment({ id, client_id, name, status });

		return context.json<APIResponse<any>>({
			success: true,
			...resolveMessageTemplate("medical.department.update.SUCCESS"),
			data: department,
		});
	},
);
