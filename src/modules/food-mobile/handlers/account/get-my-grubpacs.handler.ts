import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getMyGrubpacsRequestQueryValidator } from "@/modules/food-mobile/validators/account.validators.ts";

export const getMyGrubpacsHandler = createHandlers(
	foodAuthGuard(["admin"]),
	getMyGrubpacsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { power_status, query } = context.req.valid("query") as any;

		if (!client_id) {
			return context.json<APIResponse<any>>(
				{
					success: false,
					code: 403,
					error: "Client context missing",
				},
				{ status: 403 },
			);
		}

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

		const boxes = await prisma.box.findMany({
			where: whereClause,
			select: {
				id: true,
				box_display_id: true,
				name: true,
				vehicle_number: true,
				status: true,
				created_at: true,
				updated_at: true,
				telemetry: true,
			},
		});

		const formattedBoxes = boxes.map((box) => {
			const { telemetry, ...boxData } = box;
			const { id: _telemetryId, box_id: _telemetryBoxId, updated_at: _telemetryUpdatedAt, ...telemetryData } = (telemetry || {}) as any;
			return {
				...boxData,
				...telemetryData,
			};
		});

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				data: {
					boxes: formattedBoxes,
					count: boxes.length,
				},
			},
			{
				status: 200,
			},
		);

	},
);

