import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getDepartmentsRequestQueryValidator } from "medical/validators/department.validators";
import type { vertical_medical_department } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { getDepartments } from "@/db/actions/medical/department.actions";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	departments: vertical_medical_department[];
	count: number;
}

export const getDepartmentsHandler = createHandlers(
	medicalAuthGuard(),
	getDepartmentsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, status, manager, delivery, box, page, limit, group_by, group_by_selected_table } = context.req.valid("query") as any;

		const departmentsData = await getDepartments({
			query: query as string | undefined,
			status: status as any,
			manager,
			delivery,
			box,
			page_size: limit,
			page_number: page,
			fetch_all: !!group_by || (limit === undefined && page === undefined),
			client_id,
		});

		const finalPage = page ?? 1;
		const finalLimit = limit;

		if (group_by === "boxes") {
			const withBoxes: any[] = [];
			const withoutBoxes: any[] = [];

			for (const r of departmentsData.departments) {
				if ((r as any)._count?.boxes > 0) {
					withBoxes.push(r);
				} else {
					withoutBoxes.push(r);
				}
			}

			const groups: Record<string, any> = {};
			let totalCountAcrossGroups = 0;

			if (!group_by_selected_table || group_by_selected_table === "with_boxes") {
				const sliced = withBoxes.slice(0, finalLimit);
				groups.with_boxes = {
					array: sliced,
					count: withBoxes.length,
					pagination: calculatePagination(finalPage, finalLimit ?? withBoxes.length, withBoxes.length),
				};
				totalCountAcrossGroups += withBoxes.length;
			}

			if (!group_by_selected_table || group_by_selected_table === "without_boxes") {
				const sliced = withoutBoxes.slice(0, finalLimit);
				groups.without_boxes = {
					array: sliced,
					count: withoutBoxes.length,
					pagination: calculatePagination(finalPage, finalLimit ?? withoutBoxes.length, withoutBoxes.length),
				};
				totalCountAcrossGroups += withoutBoxes.length;
			}

			return context.json<APIResponse<{ groups: typeof groups; count: number; total_count: number }>>(
				{
					success: true,
					code: 200,
					data: { groups, count: totalCountAcrossGroups, total_count: departmentsData.count },
					pagination: calculatePagination(finalPage, finalLimit ?? departmentsData.count, departmentsData.count),
				},
				{ status: 200 },
			);
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: { count: departmentsData.departments.length, departments: departmentsData.departments },
				pagination: calculatePagination(finalPage, finalLimit ?? departmentsData.count, departmentsData.count),
			},
			{ status: 200 },
		);
	},
);
