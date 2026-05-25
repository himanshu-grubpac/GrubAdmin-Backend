import { getRestaurantById, updateRestaurant } from "@/db/actions/restaurant.actions";
import { withFullAddress } from "@/utils/restaurant.ts";
import type { restaurant } from "@/db/types";
import { foodAuthGuard } from "@/middlewares/auth";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { createHandlers } from "@/utils/hono-factory";
import { editRestaurantRequestBodyValidator } from "food/validators/restaurant.validators";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { loggerService } from "@/services/system-log.ts";
import { resolveMessageTemplate } from "@/utils/message";
import { APIError } from "@/types/error";

interface ResponseData {
	restaurant: restaurant & { full_address: string };
}

const idValidator = zValidator(
	"json",
	z.object({ id: z.ulid("Please provide a valid restaurant id") }),
	(r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const editRestaurantHandler = createHandlers(
	foodAuthGuard(["admin", "manager"]),
	editRestaurantRequestBodyValidator,
	async (context) => {
		const { user, type, client_id, user_id } = context.var;

		const body = context.req.valid("json");
		const { id, name, state, city, pincode, line_one, line_two, google_place_id, latitude, longitude, lattitude, longtitude, status } = body as any;

		if (type === "manager") {
			const managerObj = user as any;
			if (managerObj.restaurant_id !== id) {
				throw new APIError(
					"You are not authorized to edit this restaurant.",
					"food.restaurant.update.ACCESS_DENIED",
					undefined,
					403
				);
			}
		}

		const oldRestaurant = await getRestaurantById({ id, client_id });

		const location = google_place_id
			? await services.mapService.getLatLong(google_place_id)
			: null;

		const restaurant = await updateRestaurant({
			id,
			client_id,
			name,
			state,
			city,
			pincode,
			line_one,
			line_two,
			google_place_id,
			latitude: latitude ?? lattitude ?? location?.latitude ?? undefined,
			longitude: longitude ?? longtitude ?? location?.longitude ?? undefined,
			status,
		});

		// Find what changed for logging
		const changes: any[] = [];
		if (oldRestaurant) {
			const fieldsToCompare: (keyof typeof body)[] = ["name", "status", "city", "state", "pincode"];
			for (const field of fieldsToCompare) {
				if (body[field] !== undefined && (oldRestaurant as any)[field] !== body[field]) {
					changes.push({
						field,
						old_value: String((oldRestaurant as any)[field] || "None"),
						new_value: String(body[field]),
					});
				}
			}
		}

		const userObj = user as any;
		const actorName = type === "admin" 
			? userObj.name 
			: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		await loggerService.log({
			category: "Restaurant",
			type: "Updation",
			actor: {
				id: user_id,
				name: actorName,
				role: type,
				table: type === "admin" ? "client" : "vertical_food_employee",
			},
			client_id,
			subject: {
				id: restaurant.id,
				name: restaurant.name,
				type: "restaurant",
			},
			metadata: {
				changes,
			},
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.restaurant.update.SUCCESS"),
			data: { restaurant: withFullAddress(restaurant) },
		};

		return context.json<APIResponse<ResponseData>>(response, response.code as any);
	},
);

