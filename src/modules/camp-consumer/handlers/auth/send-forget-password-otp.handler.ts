import { createHandlers } from "@/utils/hono-factory.ts";
import { sendForgetPasswordOtpRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import { getUniqueCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { assertCampingConsumer, sendOtpToConsumer } from "./auth.utils.ts";

export const sendForgetPasswordOtpHandler = createHandlers(
	sendForgetPasswordOtpRequestBodyValidator,
	async (context) => {
		const { email, phone, country_code } = context.req.valid("json");
		const consumer = await getUniqueCampingConsumer({ email, phone, country_code });
		const is_account_found = !!consumer;

		if (!consumer) {
			throw new APIError("No consumer account found!", undefined, { is_account_found }, 404);
		}

		assertCampingConsumer(consumer);
		const { email: sentToEmail } = await sendOtpToConsumer(consumer, "forget_password");

		return context.json<
			APIResponse<{ otp_details: { type: string; values: string[] } }> & {
				is_account_found: boolean;
			}
		>({
			success: true,
			code: 200,
			is_account_found,
			data: {
				otp_details: {
					type: "email",
					values: [sentToEmail],
				},
			},
		});
	},
);
