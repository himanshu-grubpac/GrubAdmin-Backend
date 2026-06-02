import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reassignBoxesRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { reassignVerticalDeliveryBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";

export const reassignGrubpacHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    reassignBoxesRequestBodyValidator,
    async (context) => {
        const { client_id, user_id, user, type } = context.var;
        const { box_ids: ids, destination_restaurant_id: restaurant_id } = context.req.valid("json");

        // If restaurant_id is null, empty string, or undefined, unassign boxes
        const finalRestaurantId = (restaurant_id === null || restaurant_id === "" || restaurant_id === undefined) ? null : restaurant_id;

        // Fetch current states for logging
        const boxesBefore = await prisma.box.findMany({
            where: { id: { in: ids }, client_id: client_id },
            include: { restaurant_boxes: { where: { status: "shared" }, include: { restaurant: true } } }
        });

        const newRestaurant = finalRestaurantId 
            ? await prisma.restaurant.findUnique({ where: { id: finalRestaurantId, client_id } }) 
            : null;

        const result = await reassignVerticalDeliveryBoxes(ids, finalRestaurantId, client_id);

        const updated = result.updated_count;
        const already = result.already_in_state_count;

        let message = "";
        if (finalRestaurantId) {
            message = `${updated} box${updated === 1 ? "" : "es"} reassigned successfully.`;
            if (already > 0) {
                message += ` ${already} box${already === 1 ? "" : "es"} ${already === 1 ? "was" : "were"} already assigned to this restaurant.`;
            }
        } else {
            message = `${updated} box${updated === 1 ? "" : "es"} unassigned successfully.`;
            if (already > 0) {
                message += ` ${already} box${already === 1 ? "" : "es"} ${already === 1 ? "was" : "were"} already unassigned.`;
            }
        }

        // Log each reassignment
        const userObj = user as any;
        const actorName = type === "admin" 
            ? userObj.name 
            : `${userObj.first_name} ${userObj.last_name || ""}`.trim();

        for (const box of boxesBefore) {
            // Only log if it actually changed
            const isCurrentlyAssignedToThis = box.restaurant_boxes?.some(rb => rb.restaurant_id === finalRestaurantId);
            if (!isCurrentlyAssignedToThis) {
                const oldGroup = box.restaurant_boxes?.[0]?.restaurant?.name || "Unassigned";
                await loggerService.log({
                    category: "GrubPac",
                    type: "Reassignment",
                    actor: {
                        id: user_id,
                        name: actorName,
                        role: type,
                        table: type === "admin" ? "client" : "vertical_delivery_employee",
                    },
                    client_id,
                    subject: {
                        id: box.id,
                        name: box.name || box.box_display_id,
                        type: "box",
                    },
                    metadata: {
                        old_group: oldGroup,
                        new_group: newRestaurant?.name || "Unassigned",
                    },
                });
            }
        }

        return context.json<APIResponse<null>>(
            {
                success: true,
                code: 200,
                message,
                data: null,
            },
            { status: 200 },
        );
    },
);

