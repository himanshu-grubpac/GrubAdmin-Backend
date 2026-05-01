import { unassignRestaurantResources } from "@/db/actions/restaurant.actions";
import { foodAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { createHandlers } from "@/utils/hono-factory";
import { unassignRestaurantResourcesRequestBodyValidator } from "food-mobile/validators/restaurant.validators";

export const unassignRestaurantResourcesHandler = createHandlers(
    foodAuthGuard(["admin"]),
    unassignRestaurantResourcesRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

        const { ids } = context.req.valid("json");

        const client_id =
            type === "admin"
                ? user.id
                : (user as { client_id: string }).client_id;

        await unassignRestaurantResources({
            ids,
            client_id,
        });

        return context.json<APIResponse>(
            {
                success: true,
                code: 200,
            },
            {
                status: 200,
            },
        );
    },
);
