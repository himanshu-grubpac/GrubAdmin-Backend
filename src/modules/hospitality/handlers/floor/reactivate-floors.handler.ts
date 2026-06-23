import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { deleteFloorsRequestBodyValidator } from "hospitality/validators/floor.validators";
import { reactivateFloors } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { prisma } from "@/db";

interface ResponseData {
	reactivated_count: number;
}

export const reactivateFloorsHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	deleteFloorsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const { user_id, user, type } = context.var;

		// Fetch names before reactivation for logging
		const floorsToReactivate = await prisma.vertical_hospitality_floor.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, name: true },
		});

		const result = await reactivateFloors({
			ids,
			client_id,
		});

		// Log each reactivation
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		for (const floor of floorsToReactivate) {
			await loggerService.log({
				category: "Floor",
				type: "Reactivation",
				actor: {
					id: user_id,
					name: actorName,
					role: type,
					table: type === "admin" ? "client" : "vertical_delivery_employee",
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
