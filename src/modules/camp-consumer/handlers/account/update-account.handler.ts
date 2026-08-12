import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { updateAccountRequestBodyValidator } from "@/modules/camp-consumer/validators/account.validators.ts";
import { updateCampingConsumerProfile } from "@/db/actions/camp-consumer/consumer.actions";
import type { APIResponse } from "@/types/api";

export const updateAccountHandler = createHandlers(
	campingAuthGuard(),
	updateAccountRequestBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const body = context.req.valid("json");

		const updated = await updateCampingConsumerProfile({
			id: user_id,
			full_name: body.full_name,
			email: body.email,
			phone: body.phone,
			country_code: body.country_code,
		});

		return context.json<
			APIResponse<{
				email: string;
				full_name: string | null;
				country_code: string | null;
				mobile_number: string | null;
			}>
		>({
			success: true,
			code: 200,
			message: "Profile updated successfully",
			data: {
				email: updated.email,
				full_name: updated.full_name,
				country_code: updated.country_code,
				mobile_number: updated.phone,
			},
		});
	},
);
