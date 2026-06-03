import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reassignVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { withFullNames } from "@/utils/employee.ts";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

const bodyValidator = zValidator(
    "json",
    z.object({
        ids: z.ulid("Please provide a valid employee id").array().min(1, "Please provide at least one employee id"),
        restaurant_id: z.string().nullable().optional(), // Allow empty string
    }).refine((data) => {
        if (data.restaurant_id === null || data.restaurant_id === "") return true;
        return z.string().ulid().safeParse(data.restaurant_id).success;
    }, {
        message: "Please provide a valid restaurant id",
        path: ["restaurant_id"],
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const reassignEmployeeHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    bodyValidator,
    async (context) => {
        const { client_id, user_id, user, type } = context.var;
        const { ids, restaurant_id } = context.req.valid("json");
        const finalRestaurantId = (restaurant_id === null || restaurant_id === "") ? null : restaurant_id;

        // Fetch current states for logging
        const employeesBefore = await prisma.vertical_delivery_employee.findMany({
            where: { id: { in: ids }, client_id },
            include: { restaurant: true },
        });

        const newRestaurant = finalRestaurantId 
            ? await prisma.restaurant.findUnique({ where: { id: finalRestaurantId, client_id } }) 
            : null;

        const result = await reassignVerticalDeliveryEmployee({
            ids,
            client_id,
            restaurant_id: finalRestaurantId,
        });

        const updated = result.newly_assigned_count || 0;
        const already = result.already_assigned_count || 0;
        const skipped = result.skipped_count || 0;

        let message = "";
        if (finalRestaurantId) {
            message = `${updated} employee${updated === 1 ? "" : "s"} reassigned successfully.`;
            if (already > 0) {
                message += ` ${already} employee${already === 1 ? "" : "s"} ${already === 1 ? "was" : "were"} already assigned to this restaurant.`;
            }
        } else {
            message = `${updated} employee${updated === 1 ? "" : "s"} unassigned successfully.`;
            if (already > 0) {
                message += ` ${already} employee${already === 1 ? "" : "s"} ${already === 1 ? "was" : "were"} already unassigned.`;
            }
        }

        if (skipped > 0) {
            message += ` ${skipped} manager${skipped === 1 ? "" : "s"} could not be moved due to a manager conflict in the target restaurant.`;
        }

        // Log each reassignment
        const userObj = user as any;
        const actorName = type === "admin" 
            ? userObj.name 
            : `${userObj.first_name} ${userObj.last_name || ""}`.trim();

        for (const emp of employeesBefore) {
            // Only log for those that were actually reassigned
            if (emp.restaurant_id !== finalRestaurantId) {
                await loggerService.log({
                    category: "Employee",
                    type: "Reassignment",
                    actor: {
                        id: user_id,
                        name: actorName,
                        role: type,
                        table: type === "admin" ? "client" : "vertical_delivery_employee",
                    },
                    client_id,
                    subject: {
                        id: emp.id,
                        name: `${emp.first_name} ${emp.last_name || ""}`.trim(),
                        type: "employee",
                    },
                    metadata: {
                        old_group: emp.restaurant?.name || "Unassigned",
                        new_group: newRestaurant?.name || "Unassigned",
                    },
                });
            }
        }

        return context.json<
            APIResponse<{
                employees: any[];
            }>
        >(
            {
                success: true,
                code: 200,
                message,
                data: {
                    employees: withFullNames(result.employees).map((e) => ({
                        ...e,
                        employee_id: (e as any).employee_display_id,
                    })) as any
                },
            },
            { status: 200 },
        );
    },
);

