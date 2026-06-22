import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getDepartmentByIdRequestParamsValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { getDepartmentEmployees } from "@/db/actions/medical/department.actions";

export const getDepartmentEmployeesHandler = createHandlers(
	medicalAuthGuard(),
	getDepartmentByIdRequestParamsValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("param");
		const { status } = context.req.query() as any;

		const result = await getDepartmentEmployees({ id, client_id, status });

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Department employees fetched successfully!",
			data: result,
		});
	},
);
