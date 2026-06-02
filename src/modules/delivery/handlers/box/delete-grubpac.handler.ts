import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { deleteBoxesRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { deleteVerticalDeliveryBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const deleteGrubpacHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    deleteBoxesRequestBodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { ids } = context.req.valid("json");

        await deleteVerticalDeliveryBoxes(ids, client_id);

        
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Deletion",
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
                message: "Boxes deleted successfully",
                data: null,
            },
            { status: 200 },
        );
    },
);

