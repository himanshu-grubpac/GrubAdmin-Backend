import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reactivateFloorsRequestBodyValidator } from "hospitality/validators/floor.validators";
import { reactivateFloors } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { prisma } from "@/db";

interface ResponseData {
	reactivated_count: number;
}

export const reactivateFloorsHandler = createHandlers(
	hospitalityAuthGuard(),
	reactivateFloorsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids, reactivate_boxes } = context.req.valid("json");

		const { user_id, user } = context.var;

		// Fetch names before reactivation for logging
		const floorsToReactivate = await prisma.vertical_hospitality_floor.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, name: true },
		});

		const result = await reactivateFloors({
			ids,
			client_id,
			reactivate_boxes: !!reactivate_boxes,
		});

		// Log each reactivation
		const userObj = user as any;

		for (const floor of floorsToReactivate) {
			await loggerService.log({
				category: "Floor",
				type: "Activation",
				actor: {
					id: user_id,
					name: userObj.name || "",
					role: "admin",
					table: "client",
				},
				client_id,
				subject: {
					id: floor.id,
					name: floor.name,
					type: "floor",
				},
			});
		}

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				reactivated_count: result.reactivated_count,
			},
		});
	},
);
