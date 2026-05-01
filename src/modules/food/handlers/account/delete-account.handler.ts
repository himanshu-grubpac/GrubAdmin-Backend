import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { deleteVerticalFoodEmployees } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";

export const deleteAccountHandler = createHandlers(
	foodAuthGuard(),
	async (context) => {
		const { type, user, client_id } = context.var;

		if (type === "admin") {
			throw new APIError("can not delete", undefined, undefined, 400);
		}

		await deleteVerticalFoodEmployees({
			ids: [user.id],
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

