import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { reactivateDepartments } from "@/db/actions/medical/department.actions";

export const reactivateDepartmentHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { ids, reactivate_employees, reactivate_boxes } = await context.req.json();

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			throw new APIError("Please provide at least one department id", undefined, undefined, 400);
		}

		const result = await reactivateDepartments({
			client_id,
			ids,
			reactivate_employees,
			reactivate_boxes,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Department reactivated successfully!",
			data: result,
		});
	},
);
