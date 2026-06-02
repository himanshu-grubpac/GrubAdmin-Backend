import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { createRestaurantRequestBodyValidator } from "delivery/validators/restaurant.validators";
import type { restaurant } from "@/db/types";
import { services } from "@/services";
import { APIError } from "@/types/error";
import { createRestaurant } from "@/db/actions/restaurant.actions";
import { withFullAddress } from "@/utils/restaurant.ts";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";

interface ResponseData {
	restaurant: restaurant & { full_address: string };
}

export const createRestaurantHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	createRestaurantRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;

		const {
			name,
			state,
			city,
			pincode,
			line_one,
			line_two,
			google_place_id,
			latitude,
			longitude,
			lattitude,
			longtitude,
			status,
		} = context.req.valid("json");

		// Check for uniqueness of Name + client_id
		const existingByName = await prisma.restaurant.findFirst({
			where: {
				name,
				client_id,
				status: "active"
			}
		});
		if (existingByName) {
			throw new APIError(
				"A restaurant with this name already exists under your account.",
				"delivery.restaurant.create.DUPLICATE_NAME",
				undefined,
				409
			);
		}

		// Check for uniqueness of google_place_id
		if (google_place_id) {
			const existingByPlace = await prisma.restaurant.findFirst({
				where: {
					google_place_id,
					client_id,
					status: "active"
				}
			});
			if (existingByPlace) {
				throw new APIError(
					"A restaurant with this Google Place ID already exists under your account.",
					"delivery.restaurant.create.DUPLICATE_PLACE_ID",
					undefined,
					409
				);
			}
		}

		const googlePlaceData = google_place_id
			? await services.mapService.getLatLong(google_place_id)
			: null;

		const restaurant = await createRestaurant({
			name,
			client_id,
			state,
			city,
			pincode,
			line_one,
			line_two,
			latitude: latitude ?? lattitude ?? googlePlaceData?.latitude ?? null,
			longitude: longitude ?? longtitude ?? googlePlaceData?.longitude ?? null,
			google_place_id,
			status,
		});

		const { user_id, user, type: userType } = context.var;
		const userObj = user as any;
		const actorName = userType === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
				category: "Restaurant",
			type: "Creation",
			actor: {
				id: user_id,
				name: actorName,
				role: userType,
				table: userType === "admin" ? "client" : "vertical_delivery_employee",
			},
			client_id,
			subject: {
				id: restaurant.id,
				name: restaurant.name,
				type: "restaurant",
			},
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.restaurant.create.SUCCESS", { id: restaurant.id, name: restaurant.name }),
			data: {
				restaurant: withFullAddress(restaurant),
			},
		};

		return context.json<APIResponse<ResponseData>>(response, response.code as any);
	},
);

