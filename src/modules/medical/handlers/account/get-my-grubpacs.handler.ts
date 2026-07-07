import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getMyGrubpacsRequestQueryValidator } from "medical/validators/account.validators.ts";

const flattenBox = (box: {
	telemetry?: {
		power_status?: string | null;
		connection_status?: string | null;
		[key: string]: unknown;
	} | null;
	status: string;
	[key: string]: unknown;
}) => {
	const { telemetry, ...boxData } = box;
	const {
		id: _tid,
		box_id: _tbid,
		updated_at: _tua,
		...telemetryData
	} = (telemetry || {}) as Record<string, unknown>;

	return {
		...boxData,
		...telemetryData,
		power_status: telemetry?.power_status ?? "unknown",
	};
};

export const getMyGrubpacsHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	getMyGrubpacsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { power_status, query } = context.req.valid("query");

		const whereClause: Record<string, unknown> = {
			client_id,
			status: { not: "suspended" },
		};

		if (power_status) {
			whereClause.telemetry = { is: { power_status } };
		}

		if (query) {
			whereClause.OR = [
				{ name: { contains: query } },
				{ box_display_id: { contains: query } },
			];
		}

		const [rawBoxes, count] = await Promise.all([
			prisma.box.findMany({
				where: whereClause,
				include: {
					telemetry: true,
					medical_employee_boxes: {
						select: {
							employee_id: true,
							status: true,
							access: true,
						},
					},
				},
				orderBy: { created_at: "desc" },
			}),
			prisma.box.count({ where: whereClause }),
		]);

		const boxes = rawBoxes.map(flattenBox);

		return context.json<APIResponse<{ boxes: typeof boxes; count: number }>>(
			{ success: true, code: 200, data: { boxes, count } },
			{ status: 200 },
		);
	},
);
