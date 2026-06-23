import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { deleteDepartments } from "@/db/actions/medical/department.actions";

export const deleteDepartmentHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { ids, destination_department_id } = await context.req.json();

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			throw new APIError("Please provide at least one department id", undefined, undefined, 400);
		}

		const result = await deleteDepartments({
			client_id,
			ids,
			destination_department_id,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Departments deleted successfully!",
			data: result,
		});
	},
);
