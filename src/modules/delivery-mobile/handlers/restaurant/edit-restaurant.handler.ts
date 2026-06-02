import { updateRestaurant } from "@/db/actions/restaurant.actions";
import type { restaurant } from "@/db/types";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { createHandlers } from "@/utils/hono-factory";
import {
    editRestaurantRequestBodyValidator,
    editRestaurantRequestParamsValidator,
} from "delivery-mobile/validators/restaurant.validators";

interface ResponseData {
    restaurant: restaurant;
}

export const editRestaurantHandler = createHandlers(
    deliveryAuthGuard(["admin", "manager"]),
    editRestaurantRequestParamsValidator,
    editRestaurantRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

        const { id } = context.req.valid("param");
        const {
            name,
            state,
            city,
            pincode,
            line_one,
            line_two,
            google_place_id,
            status,
        } = context.req.valid("json");

        const client_id =
            type === "admin"
                ? user.id
                : (user as { client_id: string }).client_id;

        const location = google_place_id
            ? await services.mapService.getLatLong(google_place_id)
            : undefined;

        const restaurant = await updateRestaurant({
            id,
            client_id,
            state,
            city,
            pincode,
            line_one,
            line_two,
            google_place_id,
            latitude: location?.latitude ? location.latitude : undefined,
            longitude: location?.longitude ? location.longitude : undefined,
            status,
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
