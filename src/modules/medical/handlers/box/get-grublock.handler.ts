import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getGrublockRequestQueryValidator } from "medical/validators/box.validators.ts";
import { getMedicalBoxes } from "@/db/actions/medical/box.actions.ts";
import { cleanQueryObject } from "@/utils/clean-query.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { BoxConfig } from "@/db/mongo-schema";

const attachGrublockStatus = async (boxes: Array<Record<string, unknown>>) => {
	const configs = await BoxConfig.find({ box_id: { $in: boxes.map((b) => b.id as string) } });
	const lockMap = new Map(configs.map((c) => [c.box_id, c.grublock || "unlocked"]));
	return boxes.map((box) => ({
		...box,
		grublock_status: lockMap.get(box.id as string) || "unlocked",
		box_id: box.box_display_id,
	}));
};

export const getGrublockHandler = createHandlers(
	medicalAuthGuard(),
	getGrublockRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const query = cleanQueryObject(context.req.valid("query") as Record<string, unknown>);

		const fetchAll = !!query.group_by || (query.limit === undefined && query.page === undefined);

		const { boxes, count } = await getMedicalBoxes({
			client_id,
			page: fetchAll ? undefined : (query.page as number),
			limit: fetchAll ? undefined : (query.limit as number),
			query: query.query as string,
			status: query.status as "active" | "suspended" | undefined,
			department_id: query.department_id as string | null | undefined,
			employee_id: query.employee_id as string | null | undefined,
			power_status: query.power_status as string,
			connection_status: query.connection_status as string,
			health_status: query.health_status as string,
		});

		let formatted = await attachGrublockStatus(boxes as Array<Record<string, unknown>>);

		if (query.grublock_status) {
			formatted = formatted.filter((b) => b.grublock_status === query.grublock_status);
		}

		const finalPage = (query.page as number) ?? 1;
		const finalLimit = (query.limit as number) ?? count;

		return context.json<APIResponse<{ boxes: typeof formatted; count: number }>>(
			{
				success: true,
				code: 200,
				data: { boxes: formatted, count: query.grublock_status ? formatted.length : count },
				pagination: calculatePagination(finalPage, finalLimit, query.grublock_status ? formatted.length : count),
			},
			{ status: 200 },
		);
	},
);
