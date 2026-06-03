import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { reactivateRestaurants } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { loggerService } from "@/services/system-log.ts";
import { prisma } from "@/db";

const bodyValidator = zValidator(
    "json",
    z.object({
        ids: z.ulid("Please provide a valid restaurant id").array().min(1, "Please provide at least one id"),
        reactivate_employees: z.boolean().default(false),
        reactivate_boxes: z.boolean().default(false),
    }),
    (r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const reactivateRestaurantsHandler = createHandlers(
    deliveryAuthGuard(["admin"]),
    bodyValidator,
    async (context) => {
        const { client_id, user_id, user, type } = context.var;
        const { ids, reactivate_employees, reactivate_boxes } = context.req.valid("json");

        // Fetch names for logging
        const restaurants = await prisma.restaurant.findMany({
            where: { id: { in: ids }, client_id },
            select: { id: true, name: true },
        });

        const result = await reactivateRestaurants({ ids, client_id, reactivate_employees, reactivate_boxes });

        // Log each reactivation
        const userObj = user as any;
        const actorName = type === "admin" 
            ? userObj.name 
            : `${userObj.first_name} ${userObj.last_name || ""}`.trim();

        for (const res of restaurants) {
            await loggerService.log({
                category: "Restaurant",
                type: "Activation",
                actor: {
                    id: user_id,
                    name: actorName,
                    role: type,
                    table: type === "admin" ? "client" : "vertical_delivery_employee",
                },
                client_id,
                subject: {
                    id: res.id,
                    name: res.name,
                    type: "restaurant",
                },
            });
        }

        return context.json<APIResponse<{ reactivated_count: number }>>(
            { success: true, code: 200, data: { reactivated_count: result.count } },
            { status: 200 },
        );
    },
);

