import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reassignDepartmentRequestBodyValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { reassignDepartmentResources } from "@/db/actions/medical/department.actions";

export const reassignDepartmentHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	reassignDepartmentRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await reassignDepartmentResources({
			from_department_ids: body.department_ids,
			to_department_id: body.destination_department_id!,
			client_id,
			reassign_employees: body.reassign_employees,
			reassign_boxes: body.reassign_boxes,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Department resources reassigned successfully!",
			data: result,
		});
	},
);
