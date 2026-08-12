import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { updatePasswordRequestBodyValidator } from "@/modules/camp-consumer/validators/account.validators.ts";
import { changeCampingConsumerPassword } from "@/db/actions/camp-consumer/consumer.actions";
import type { APIResponse } from "@/types/api";

export const updatePasswordHandler = createHandlers(
	campingAuthGuard(),
	updatePasswordRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const { current_password, new_password } = context.req.valid("json");

		await changeCampingConsumerPassword({
			id: user_id,
			current_password,
			new_password,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
			message: "Password updated successfully",
		});
	},
);
