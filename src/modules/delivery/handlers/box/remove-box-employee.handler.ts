import { loggerService } from "@/services/system-log.ts";

import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reassignBoxEmployeeRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { removeBoxEmployees } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const removeBoxEmployeeHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    reassignBoxEmployeeRequestBodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { box_ids, employee_ids } = context.req.valid("json");

        await removeBoxEmployees(box_ids, employee_ids, client_id);

        
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Connection status",
					actor: { 
						id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
						name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id: context.var.client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: { disconnected: true }
				});
			}
		} catch (err) { }
		// End auto-injected log

		return context.json<APIResponse<null>>(
            {
                success: true,
                code: 200,
                message: "Employees removed from boxes successfully",
                data: null,
            },
            { status: 200 },
        );
    },
);
