import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { deleteFloorsRequestBodyValidator } from "hospitality/validators/floor.validators";
import { deleteFloors } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { prisma } from "@/db";

interface ResponseData {
	deleted_count: number;
}

export const deleteFloorsHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	deleteFloorsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids, destination_floor_id } = context.req.valid("json");

		const { user_id, user, type } = context.var;

		// Fetch names before deletion for logging
		const floorsToDelete = await prisma.vertical_hospitality_floor.findMany({
			where: { id: { in: ids }, client_id },
			select: { id: true, name: true },
		});

		const result = await deleteFloors({
			ids,
			client_id,
			destination_floor_id:
				destination_floor_id === "" || destination_floor_id === null || destination_floor_id === undefined
					? null
					: destination_floor_id,
		});

		// Log each deletion
		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		for (const floor of floorsToDelete) {
			await loggerService.log({
				category: "Floor",
				type: "Deletion",
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
				deleted_count: result.deleted_count,
			},
		});
	},
);
