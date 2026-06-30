import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getGrublockRequestQueryValidator } from "medical/validators/box.validators.ts";
import { getMedicalBoxes } from "@/db/actions/medical/box.actions.ts";
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
		const query = context.req.valid("query") as {
			page?: number;
			limit?: number;
			query?: string;
			status?: "active" | "suspended";
			department_id?: string | null;
			employee_id?: string | null;
			grublock_status?: string;
			power_status?: string;
			connection_status?: string;
			health_status?: string;
		};

		const { boxes, count } = await getMedicalBoxes({
			client_id,
			page: query.page,
			limit: query.limit,
			query: query.query,
			status: query.status,
			department_id: query.department_id,
			employee_id: query.employee_id,
			power_status: query.power_status,
			connection_status: query.connection_status,
			health_status: query.health_status,
		});

		let formatted = await attachGrublockStatus(boxes as Array<Record<string, unknown>>);

		if (query.grublock_status) {
			formatted = formatted.filter((b) => b.grublock_status === query.grublock_status);
		}

		const finalPage = query.page ?? 1;
		const finalLimit = query.limit ?? count;

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
