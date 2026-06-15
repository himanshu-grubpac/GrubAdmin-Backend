import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createRestaurantRequestBodyValidator } from "delivery-mobile/validators/restaurant.validators";
import type { restaurant } from "@/db/types";
import { services } from "@/services";
import { APIError } from "@/types/error";
import { createRestaurant } from "@/db/actions/restaurant.actions";
import type { APIResponse } from "@/types/api";

interface ResponseData {
    restaurant: restaurant;
}

export const createRestaurantHandler = createHandlers(
    deliveryAuthGuard(["admin", "manager"]),
    createRestaurantRequestBodyValidator,
    async (context) => {
        const { user, type } = context.var;

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

        const googlePlaceData =
            await services.mapService.getLatLong(google_place_id);

        if (
            !googlePlaceData ||
            !googlePlaceData.latitude ||
            !googlePlaceData.longitude
        ) {
            throw new APIError("Invalid google place id", undefined, undefined, 400);
        }

        const restaurant = await createRestaurant({
            name,
            client_id,
            state,
            city,
            pincode,
            line_one,
            line_two,
            latitude: googlePlaceData.latitude,
            longitude: googlePlaceData.longitude,
            google_place_id,
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
