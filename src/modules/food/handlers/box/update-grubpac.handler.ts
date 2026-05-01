import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { updateGrubpacRequestBodyValidator } from "food/validators/box.validators.ts";
import { updateVerticalFoodGrubpac } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import type { box } from "@/db/types";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";

interface ResponseData {
	box: box;
}

export const updateGrubpacHandler = createHandlers(
	foodAuthGuard(["admin"]),
	updateGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const {
			id,
			name,
			box_id,
			vehicle_number,
			restaurant_ids,
			blocked_employee_ids,
			access_mode,
			ext_temp,
		} = context.req.valid("json");

		// Fetch previous state for logging
		const previousBox = await prisma.box.findUnique({
			where: { id, client_id: client_id },
			include: { lock: true, telemetry: true }
		});

		const box = await updateVerticalFoodGrubpac({
			id,
			name,
			box_display_id: box_id,
			vehicle_number,
			restaurant_ids,
			blocked_employee_ids,
			client_id,
			access_mode,
			ext_temp,
		});

		// Compare and log changes
		if (previousBox) {
			const changes: any[] = [];
			const prevTelemetry = (previousBox as any).telemetry || {};

			if (name !== undefined && name !== previousBox.name) 
				changes.push({ field: "name", old_value: previousBox.name, new_value: name });
			if (box_id !== undefined && box_id !== previousBox.box_display_id) 
				changes.push({ field: "box_id", old_value: previousBox.box_display_id, new_value: box_id });
			if (vehicle_number !== undefined && vehicle_number !== previousBox.vehicle_number) 
				changes.push({ field: "vehicle_number", old_value: previousBox.vehicle_number, new_value: vehicle_number });
			if (ext_temp !== undefined && ext_temp !== prevTelemetry.ext_temp) 
				changes.push({ field: "ext_temp", old_value: prevTelemetry.ext_temp, new_value: ext_temp });


			if (changes.length > 0) {
				const userObj = user as any;
				const actorName = type === "admin" 
					? userObj.name 
					: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

				await loggerService.log({
					category: "GrubPac",
					type: "Updation",
					actor: {
						id: user_id,
						name: actorName,
						role: type,
						table: type === "admin" ? "client" : "vertical_food_employee",
					},
					client_id,
					subject: {
						id: box.id,
						name: box.name || "Box",
						type: "box",
					},
					metadata: {
						changes
					}
				});
			}
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.box.settings.SUCCESS", { id: box.id }),
			message: "Box updated successfully", // Specific override
			data: {
				box: {
					...box,
					box_id: (box as any).box_display_id,
				} as any,
			},
		};

		return context.json<APIResponse<ResponseData>>(response, response.code as any);
	},
);

