import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { suspendDepartmentResourcesRequestBodyValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { suspendDepartmentResources } from "@/db/actions/medical/department.actions";

export const suspendDepartmentHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	suspendDepartmentResourcesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids, resource_status, destination_department_id } = context.req.valid("json");

		await suspendDepartmentResources({
			client_id,
			ids,
			resource_status: resource_status as "suspend" | "assign",
			destination_department_id,
		});

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message: "Department suspended successfully!",
		});
	},
);
