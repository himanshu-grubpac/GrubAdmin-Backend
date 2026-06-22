import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { assignDepartmentManager } from "@/db/actions/medical/department.actions";

export const assignDepartmentManagerHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		const { client_id } = context.var;
		const { id, manager_id } = await context.req.json();

		if (!id) {
			throw new APIError("Please provide a department id", undefined, undefined, 400);
		}

		const department = await assignDepartmentManager({
			id,
			client_id,
			manager_id: manager_id ?? null,
		});

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: manager_id ? "Manager assigned successfully!" : "Manager unassigned successfully!",
			data: department,
		});
	},
);
