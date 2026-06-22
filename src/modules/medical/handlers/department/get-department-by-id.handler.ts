import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getDepartmentByIdRequestParamsValidator } from "medical/validators/department.validators";
import type { APIResponse } from "@/types/api";
import { getDepartmentById } from "@/db/actions/medical/department.actions";

export const getDepartmentByIdHandler = createHandlers(
	medicalAuthGuard(),
	getDepartmentByIdRequestParamsValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("param");

		const department = await getDepartmentById({ id, client_id });

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Department details fetched successfully!",
			data: department,
		});
	},
);
