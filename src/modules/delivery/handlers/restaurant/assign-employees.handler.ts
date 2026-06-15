import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { assignEmployeesToRestaurant, getRestaurantById } from "@/db/actions/restaurant.actions.ts";
import type { APIResponse } from "@/types/api";
import { assignEmployeesRequestBodyValidator } from "delivery/validators/restaurant.validators.ts";
import type { client_employee_role } from "@/db/types";

export const assignEmployeesHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    assignEmployeesRequestBodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { id, employee_ids, role } = context.req.valid("json");

        // Map "driver" to "delivery" for the database action
        const prismaRole: client_employee_role = role === "driver" ? "delivery" : "manager";

        await assignEmployeesToRestaurant({
            restaurant_id: id,
            employee_ids,
            role: prismaRole,
            client_id,
        });

        const restaurant = await getRestaurantById({ id, client_id });

        
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
                    restaurant,
                },
            },
            {
                status: 200,
            },
        );
    },
);
