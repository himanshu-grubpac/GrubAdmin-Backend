import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { removeRestaurantEmployees } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
    "json",
    z.object({
        id: z.ulid("Please provide a valid restaurant id"),
        employee_ids: z
            .ulid("Please provide a valid employee id")
            .array()
            .min(1, "Please provide at least one employee id"),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const deleteRestaurantEmployeesHandler = createHandlers(
    foodAuthGuard(["admin"]),
    bodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { id, employee_ids } = context.req.valid("json");

        const result = await removeRestaurantEmployees({ id, client_id, employee_ids });

        
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "Restaurant",
					type: "Updation",
					actor: { 
						id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
						name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id: context.var.client_id,
					subject: { id: id, name: id, type: "restaurant" },
					metadata: {  }
				});
			}
		} catch (err) { }
		// End auto-injected log

		return context.json<APIResponse<{ removed_count: number }>>(
            { success: true, code: 200, data: { removed_count: result.removed_count } },
            { status: 200 },
        );
    },
);
