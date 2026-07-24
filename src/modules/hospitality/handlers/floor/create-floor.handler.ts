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
	hospitalityAuthGuard(),
	createFloorRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { name, status } = context.req.valid("json");

		const floor = await createFloor({
			name,
			client_id,
			status,
		});

		const { user_id, user } = context.var;
		const userObj = user as any;

		await loggerService.log({
			category: "Floor",
			type: "Creation",
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
