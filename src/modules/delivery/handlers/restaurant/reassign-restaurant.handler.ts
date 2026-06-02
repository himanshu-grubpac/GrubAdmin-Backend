import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reassignRestaurantResources, unassignRestaurantResources } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";
import { reassignRestaurantRequestBodyValidator } from "delivery/validators/restaurant.validators.ts";

export const reassignRestaurantHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    reassignRestaurantRequestBodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const {
            restaurant_ids,
            destination_restaurant_id,
            reassign_employees,
            reassign_boxes,
        } = context.req.valid("json");

        const finalDestinationId =
            destination_restaurant_id === "" || destination_restaurant_id === null
                ? null
                : destination_restaurant_id;

        if (!finalDestinationId) {
            // Unassign in bulk
            await unassignRestaurantResources({
                ids: restaurant_ids,
                client_id,
            });

            return context.json<APIResponse<{ restaurant_ids: string[] }>>(
                { success: true, code: 200, data: { restaurant_ids } },
                { status: 200 },
            );
        } else {
            // Reassign in bulk
            const result = await reassignRestaurantResources({
                from_restaurant_ids: restaurant_ids,
                to_restaurant_id: finalDestinationId,
                client_id,
                reassign_employees,
                reassign_boxes,
            });

            
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.restaurant_ids || (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "Restaurant",
					type: "Reassignment",
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

		return context.json<APIResponse<{ from_restaurant_ids: string[]; to_restaurant_id: string }>>(
                { success: true, code: 200, data: result },
                { status: 200 },
            );
        }
    },
);
