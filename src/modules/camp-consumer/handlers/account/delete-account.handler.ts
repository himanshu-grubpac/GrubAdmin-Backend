import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { deleteAccountRequestBodyValidator } from "@/modules/camp-consumer/validators/account.validators.ts";
import type { APIResponse } from "@/types/api";
import { deleteCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";

export const deleteAccountHandler = createHandlers(
	campingAuthGuard(),
	deleteAccountRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");

		await deleteCampingConsumer(user_id);

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Account deleted successfully.",
			},
			{ status: 200 },
		);
	},
);
