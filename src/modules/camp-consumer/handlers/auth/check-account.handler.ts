import { createHandlers } from "@/utils/hono-factory.ts";
import { checkAccountRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import { getUniqueCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";
import type { APIResponse } from "@/types/api";
import { sendOtpToConsumer } from "./auth.utils.ts";

export const checkAccountHandler = createHandlers(
	checkAccountRequestBodyValidator,
	async (context) => {
		const { email, phone, country_code } = context.req.valid("json");

		const consumer = await getUniqueCampingConsumer({ email, phone, country_code });
		const is_account_found = !!consumer;
		const is_password_set = consumer ? !!consumer.password : false;
		let message: string | undefined;

		if (consumer && !is_password_set && consumer.status !== "suspended") {
			await sendOtpToConsumer(consumer, consumer.status === "pending" ? "register" : "login");
			message = "OTP sent successfully.";
		}

		return context.json<
			APIResponse & {
				is_account_found: boolean;
				is_password_set: boolean;
				message?: string;
			}
		>({
			success: true,
			code: 200,
			is_account_found,
			is_password_set,
			message,
		});
	},
);
