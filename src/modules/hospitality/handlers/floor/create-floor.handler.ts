import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createFloorRequestBodyValidator } from "hospitality/validators/floor.validators";
import { createFloor } from "@/db/actions/floor.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";

interface ResponseData {
	floor: any;
}

export const createFloorHandler = createHandlers(
	hospitalityAuthGuard(["admin", "manager"]),
	createFloorRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { name, status } = context.req.valid("json");

		const floor = await createFloor({
			name,
			client_id,
			status,
		});

		const { user_id, user, type: userType } = context.var;
		const userObj = user as any;
		const actorName = userType === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Floor",
			type: "Creation",
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
			...resolveMessageTemplate("hospitality.floor.create.SUCCESS", { id: floor.id, name: floor.name }),
			data: {
				floor,
			},
		};

		return context.json<APIResponse<ResponseData>>(response, response.code as any);
	},
);
