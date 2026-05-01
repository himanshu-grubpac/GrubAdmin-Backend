import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { assignRestaurantManager } from "@/db/actions/restaurant.actions";
import { prisma } from "@/db/index.ts";
import { withFullAddress } from "@/utils/restaurant.ts";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
    "json",
    z.object({
        id: z.ulid("Please provide a valid restaurant id"),
        manager_id: z.ulid("Please provide a valid employee id").nullable(),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const assignRestaurantManagerHandler = createHandlers(
    foodAuthGuard(["admin"]),
    bodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { id, manager_id } = context.req.valid("json");

        const restaurant = await assignRestaurantManager({ id, client_id, manager_id });

        // Since we removed the direct 'manager' relation, fetch the manager manually if assigned
        let manager = null;
        if (manager_id) {
           manager = await prisma.vertical_food_employee.findUnique({
               where: { id: manager_id, client_id }
           });
        }

        
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "Restaurant",
					type: "Assignment",
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

		return context.json<APIResponse<{ restaurant: any }>>(
            {
                success: true,
                code: 200,
                data: {
                    restaurant: {
                        ...withFullAddress(restaurant),
                        manager: manager ? {
                            ...manager,
                            employee_id: manager.employee_display_id,
                        } : null,
                    }
                }
            },
            { status: 200 },
        );
    },
);
