import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getBoxesRequestQueryValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { getMedicalBoxes } from "@/db/actions/medical/box.actions";
import { calculatePagination } from "@/utils/pagination.ts";

export const getGrubpacHandler = createHandlers(
	medicalAuthGuard(),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const query = context.req.valid("query") as any;

		const boxesData = await getMedicalBoxes({
			page: query.page,
			limit: query.limit,
			query: query.query,
			status: query.status,
			department_id: query.department_id,
			employee_id: query.employee_id,
			client_id,
			group_by: query.group_by,
			connection_status: query.connection_status,
			power_status: query.power_status,
			health_status: query.health_status,
		});

		const finalPage = query.page ?? 1;
		const finalLimit = query.limit;

		return context.json<APIResponse<typeof boxesData>>(
			{
				success: true,
				code: 200,
				data: boxesData,
				pagination: calculatePagination(finalPage, finalLimit ?? boxesData.count, boxesData.count),
			},
			{ status: 200 },
		);
	},
);
