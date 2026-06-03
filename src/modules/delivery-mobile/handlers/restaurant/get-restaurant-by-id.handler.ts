import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getRestaurantByIdRequestParamsValidator } from "delivery-mobile/validators/restaurant.validators";
import { getRestaurantById } from "@/db/actions/restaurant.actions";
import type { restaurant } from "@/db/types";
import type { APIResponse } from "@/types/api";

interface ResponseData {
    restaurant: restaurant | null;
}

export const getRestaurantByIdHandler = createHandlers(
    deliveryAuthGuard(),
    getRestaurantByIdRequestParamsValidator,
    async (context) => {
        const { id } = context.req.valid("param");

        const { type, user } = context.var;

        const client_id =
            type === "admin"
                ? user.id
                : (user as { client_id: string }).client_id;

        const restaurant = await getRestaurantById({
            id,
            client_id,
        });

        return context.json<APIResponse<ResponseData>>(
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
