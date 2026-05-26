import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getMyGrubpacsRequestQueryValidator } from "food/validators/account.validators.ts";

export const getMyGrubpacsHandler = createHandlers(
	foodAuthGuard(["admin"]),
	getMyGrubpacsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { power_status, query } = context.req.valid("query") as any;

		const whereClause: any = {
			client_id: client_id,
			status: {
				not: "suspended",
			},
		};

		if (power_status) {
			whereClause.telemetry = {
				is: {
					power_status: power_status,
				},
			};
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
				orderBy: {
					created_at: "desc",
				},
			}),
			prisma.box.count({
				where: whereClause,
			}),
		]);

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				data: {
					boxes,
					count,
				},
			},
			{
				status: 200,
			},
		);
	},
);

