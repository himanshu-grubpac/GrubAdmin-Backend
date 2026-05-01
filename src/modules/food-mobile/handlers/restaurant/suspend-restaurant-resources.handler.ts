import { suspendRestaurantResources } from "@/db/actions/restaurant.actions";
import { foodAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { createHandlers } from "@/utils/hono-factory";
import { suspendRestaurantResourcesRequestBodyValidator } from "food-mobile/validators/restaurant.validators";

export const suspendRestaurantResourcesHandler = createHandlers(
    foodAuthGuard(["admin"]),
    suspendRestaurantResourcesRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

        const { ids } = context.req.valid("json");

        const client_id =
            type === "admin"
                ? user.id
                : (user as { client_id: string }).client_id;

        await suspendRestaurantResources({
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
