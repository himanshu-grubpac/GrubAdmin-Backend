import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { suspendBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { suspendVerticalDeliveryBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const suspendGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	suspendBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await suspendVerticalDeliveryBoxes(ids, client_id);

		const updatedCount = result.updated_boxes.length;
		const alreadyCount = result.already_in_state_count;

		let message = `${updatedCount} box${updatedCount === 1 ? "" : "es"} suspended successfully.`;
		if (alreadyCount > 0) {
			message += ` ${alreadyCount} box${alreadyCount === 1 ? "" : "es"} ${alreadyCount === 1 ? "was" : "were"} already suspended.`;
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.box.suspend"),
			message,
			data: result,
		};

		try {
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Suspension",
					actor: { 
						id: client_id || "Unknown", 
						name: "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: {  }
				});
			}
		} catch (err) { }

		return context.json<APIResponse<null>>(response as any, response.code as any);
	},
);
