import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { updateFloorRequestBodyValidator } from "hospitality/validators/floor.validators";
import { updateFloor } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";

interface ResponseData {
	floor: any;
}

export const editFloorHandler = createHandlers(
	hospitalityAuthGuard(["admin", "manager"]),
	updateFloorRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id, name, status } = context.req.valid("json");

		const floor = await updateFloor({
			id,
			client_id,
			name,
			status,
		});

		const { user_id, user, type: userType } = context.var;
		const userObj = user as any;
		const actorName = userType === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Floor",
			type: "Update",
			actor: {
				id: user_id,
				name: actorName,
				role: userType,
				table: userType === "admin" ? "client" : "vertical_delivery_employee",
			},
			client_id,
			subject: {
				id: floor.id,
				name: floor.name,
				type: "floor",
			},
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.floor.update.SUCCESS", { id: floor.id, name: floor.name }),
			data: {
				floor,
			},
		};

		return context.json<APIResponse<ResponseData>>(response, response.code as any);
	},
);
