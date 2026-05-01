import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { deleteRestaurants, deleteSuspendedRestaurants } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { loggerService } from "@/services/system-log.ts";
import { prisma } from "@/db";

const bodyValidator = zValidator(
    "json",
    z.object({
        ids: z
            .ulid("Please provide a valid restaurant id")
            .array()
            .min(1, "Please provide at least one id"),
        destination_restaurant_id: z.string().ulid().nullable().optional().or(z.literal("")),
    }),
    (r) => {
        if (!r.success) validatorErrorHandler(r.error);
    },
);

export const deleteRestaurantsHandler = createHandlers(
    foodAuthGuard(["admin"]),
    bodyValidator,
    async (context) => {
        const { client_id } = context.var;
        const { ids, destination_restaurant_id } = context.req.valid("json");

        const finalDestinationId =
            destination_restaurant_id === "" || destination_restaurant_id === null || destination_restaurant_id === undefined
                ? null
                : destination_restaurant_id;

        const { user_id, user, type } = context.var;

        // Fetch names before deletion for logging
        const restaurantsToDelete = await prisma.restaurant.findMany({
            where: { id: { in: ids }, client_id },
            select: { id: true, name: true },
        });

        const result = await deleteRestaurants({
            ids,
            client_id,
            destination_restaurant_id: finalDestinationId,
        });

        // Log each deletion
        const userObj = user as any;
        const actorName = type === "admin" 
            ? userObj.name 
            : `${userObj.first_name} ${userObj.last_name || ""}`.trim();

        for (const res of restaurantsToDelete) {
            await loggerService.log({
                category: "Restaurant",
                type: "Deletion",
                actor: {
                    id: user_id,
                    name: actorName,
                    role: type,
                    table: type === "admin" ? "client" : "vertical_food_employee",
                },
                client_id,
                subject: {
                    id: res.id,
                    name: res.name,
                    type: "restaurant",
                },
            });
        }

        return context.json<APIResponse<{ deleted_count: number }>>(
            { success: true, code: 200, data: { deleted_count: result.count } },
            { status: 200 },
        );
    },
);

