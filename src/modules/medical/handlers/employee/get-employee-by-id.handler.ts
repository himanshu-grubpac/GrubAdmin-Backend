import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { type APIResponse } from "@/types/api";
import { getMedicalEmployeeById } from "@/db/actions/medical/employee.actions";

export const getEmployeeByIdHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.query() as any;

		if (!id) {
			return context.json<APIResponse<null>>({ success: false, error: "Employee ID is required", code: 400 }, { status: 400 });
		}

		const employee = await getMedicalEmployeeById({ id, client_id });

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Employee details fetched successfully!",
			data: employee,
		});
	},
);
