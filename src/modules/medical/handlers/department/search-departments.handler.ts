import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { searchDepartmentRequestQueryValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { searchDepartments } from "@/db/actions/medical/department.actions";

export const searchDepartmentsHandler = createHandlers(
	medicalAuthGuard(),
	searchDepartmentRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const departments = await searchDepartments({ query, client_id, limit, status });

		return context.json<APIResponse<typeof departments>>({
			success: true,
			code: 200,
			message: "Departments fetched successfully!",
			data: departments,
		});
	},
);
