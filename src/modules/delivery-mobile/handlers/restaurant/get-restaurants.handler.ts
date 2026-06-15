import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getRestaurantsRequestQueryValidator } from "delivery-mobile/validators/restaurant.validators";
import type { restaurant } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { getRestaurants } from "@/db/actions/restaurant.actions";

interface ResponseData {
    restaurants: restaurant[];
    count: number;
}

export const getRestaurantsHandler = createHandlers(
    deliveryAuthGuard(),
    getRestaurantsRequestQueryValidator,
    async (context) => {
        const { client_id } = context.var;

        const { query, status, manager, driver, box, page_size, page_number } =
            context.req.valid("query");

        const restaurantsData = await getRestaurants({
            query,
            status,
            manager,
            driver,
            box,
            page_size,
            page_number,
            client_id,
        });

        return context.json<APIResponse<ResponseData>>(
            {
                success: true,
                code: 200,
                data: restaurantsData,
                pagination: calculatePagination(page_number, page_size, restaurantsData.count),
            },
            {
                status: 200,
            },
        );
    },
);
