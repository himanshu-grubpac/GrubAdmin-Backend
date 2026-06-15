import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { suspendEmployeesRequestBodyValidator } from "delivery-mobile/validators/employee.validators";
import { toggleSuspendVerticalDeliveryEmployees } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";

export const suspendEmployeesHandler = createHandlers(
	deliveryAuthGuard(["manager", "admin"]),
	suspendEmployeesRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;

		const { ids } = context.req.valid("json");

		const client_id =
			type === "admin"
				? user.id
				: (user as { client_id: string }).client_id;

		if (ids.includes(user.id)) {
			throw new APIError("You cannot suspend yourself!", undefined, undefined, 400);
		}

		await toggleSuspendVerticalDeliveryEmployees({
			ids,
			client_id,
			state: "suspended",
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

