import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getEmployeesRequestQueryValidator } from "medical/validators/employee.validators";
import type { APIResponse } from "@/types/api";
import { getMedicalEmployees } from "@/db/actions/medical/employee.actions";
import { calculatePagination } from "@/utils/pagination.ts";

export const getEmployeesHandler = createHandlers(
	medicalAuthGuard(),
	getEmployeesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const query = context.req.valid("query") as any;

		const employeesData = await getMedicalEmployees({
			query: query.query,
			status: query.status,
			roles: query.role ? [query.role] : (query["roles[]"] ? (Array.isArray(query["roles[]"]) ? query["roles[]"] : [query["roles[]"]]) : undefined),
			department_ids: query.department_ids ? (Array.isArray(query.department_ids) ? query.department_ids : [query.department_ids]) : (query.department_id ? [query.department_id] : undefined),
			pageNumber: query.page,
			pageSize: query.limit,
			client_id,
			fetchAll: !!query.group_by || (!query.limit && !query.page),
			with_connected_boxes: query.with_connected_boxes,
		});

		const finalPage = query.page ?? 1;
		const finalLimit = query.limit;

		return context.json<APIResponse<typeof employeesData>>(
			{
				success: true,
				code: 200,
				data: employeesData,
				pagination: calculatePagination(finalPage, finalLimit ?? employeesData.count, employeesData.count),
			},
			{ status: 200 },
		);
	},
);
