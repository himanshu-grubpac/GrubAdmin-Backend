import { deliveryAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getRestaurantById } from "@/db/actions/restaurant.actions";
import { withFullAddress } from "@/utils/restaurant.ts";
import type { restaurant } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

interface ResponseData {
	restaurant: (restaurant & { full_address: string }) | null;
}

const queryValidator = zValidator(
	"query",
	z.object({ id: z.ulid("Please provide a valid restaurant id") }),
	(r) => { if (!r.success) validatorErrorHandler(r.error); },
);

export const getRestaurantByIdHandler = createHandlers(
	deliveryAuthGuard(),
	queryValidator,
	async (context) => {
		const { id } = context.req.valid("query");
		const { client_id } = context.var;

		const restaurant = await getRestaurantById({ id, client_id });

		const formattedRestaurant = restaurant ? {
			...withFullAddress(restaurant),
			manager: (restaurant as any).manager ? {
				...(restaurant as any).manager,
				employee_id: (restaurant as any).manager.employee_display_id,
			} : null,
		} : null;

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: { restaurant: formattedRestaurant as any },
			},
			{ status: 200 },
		);
	},
);
