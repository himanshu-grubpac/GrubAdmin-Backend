import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { reactivateBoxesRequestBodyValidator } from "food/validators/box.validators.ts";
import { reactivateVerticalFoodBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const reactivateGrubpacHandler = createHandlers(
	foodAuthGuard(["admin"]),
	reactivateBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await reactivateVerticalFoodBoxes(ids, client_id);

		const updatedCount = result.updated_boxes.length;
		const alreadyCount = result.already_in_state_count;

		let message = `${updatedCount} box${updatedCount === 1 ? "" : "es"} reactivated successfully.`;
		if (alreadyCount > 0) {
			message += ` ${alreadyCount} box${alreadyCount === 1 ? "" : "es"} ${alreadyCount === 1 ? "was" : "already"} active.`;
		}

		
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Activation",
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

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message,
				data: null,
			},
			{
				status: 200,
			},
		);
	},
);

