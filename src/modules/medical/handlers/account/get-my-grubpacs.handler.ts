import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getMyGrubpacsRequestQueryValidator } from "medical/validators/account.validators.ts";

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

		const [boxes, count] = await Promise.all([
			prisma.box.findMany({
				where: whereClause,
				orderBy: { created_at: "desc" },
			}),
			prisma.box.count({ where: whereClause }),
		]);

		return context.json<APIResponse<{ boxes: typeof boxes; count: number }>>(
			{ success: true, code: 200, data: { boxes, count } },
			{ status: 200 },
		);
	},
);
