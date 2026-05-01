import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { suspendBoxesRequestBodyValidator } from "food/validators/box.validators.ts";
import { suspendVerticalFoodBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const suspendGrubpacHandler = createHandlers(
	foodAuthGuard(["admin"]),
	suspendBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await suspendVerticalFoodBoxes(ids, client_id);

		const updatedCount = result.updated_boxes.length;
		const alreadyCount = result.already_in_state_count;

		let message = `${updatedCount} box${updatedCount === 1 ? "" : "es"} suspended successfully.`;
		if (alreadyCount > 0) {
			message += ` ${alreadyCount} box${alreadyCount === 1 ? "" : "es"} ${alreadyCount === 1 ? "was" : "were"} already suspended.`;
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.box.suspend"),
			message, // Keep the dynamic count feedback
			data: result,
		};

		
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Suspension",
					actor: { 
						id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
						name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id: context.var.client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: {  }
				});
			}
		} catch (err) { }
		// End auto-injected log

		return context.json<APIResponse<null>>(response as any, response.code as any);
	},
);

