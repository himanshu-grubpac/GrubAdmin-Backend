import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getDepartmentDropdowns } from "@/db/actions/medical/department.actions.ts";
import { searchMedicalEmployees } from "@/db/actions/medical/employee.actions.ts";
import { withFullNames } from "@/utils/employee.ts";

interface ResponseData {
	departments: Awaited<ReturnType<typeof getDepartmentDropdowns>>;
	employees: {
		id: string;
		name: string;
		employee_id: string;
		status: string;
	}[];
}

export const getGrubpacDropdownsHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { client_id } = context.var;

		const [departments, employees] = await Promise.all([
			getDepartmentDropdowns({ client_id }),
			searchMedicalEmployees({
				client_id,
				limit: 1000,
				status: "all",
			}),
		]);

		const formattedEmployees = withFullNames(employees).map((e) => ({
			id: e.id,
			name: e.full_name,
			employee_id: (e as { employee_display_id?: string }).employee_display_id ?? "",
			status: e.status,
		}));

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					departments,
					employees: formattedEmployees,
				},
			},
			{ status: 200 },
		);
	},
);
