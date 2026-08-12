import { createHandlers } from "@/utils/hono-factory.ts";
import { sendOtpRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import {
	createPendingCampingConsumer,
	getUniqueCampingConsumer,
} from "@/db/actions/camp-consumer/consumer.actions";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { assertCampingConsumer, resolveConsumerEmail, sendOtpToConsumer } from "./auth.utils.ts";

export const sendOtpHandler = createHandlers(sendOtpRequestBodyValidator, async (context) => {
	const { email, phone, country_code, for_what, full_name } = context.req.valid("json");

	let consumer = await getUniqueCampingConsumer({ email, phone, country_code });
	const isNewRegistration = !consumer;

	if (!consumer) {
		if (!email) {
			throw new APIError("Email is required to register a new account", undefined, undefined, 400);
		}
		consumer = await createPendingCampingConsumer({
			email,
			phone,
			country_code,
			full_name,
		});
	}

	assertCampingConsumer(consumer);

	const otpPurpose =
		for_what === "register" || consumer.status === "pending" ? "register" : "login";

	const { email: sentToEmail } = await sendOtpToConsumer(consumer, otpPurpose);

	return context.json<
		APIResponse<{ otp_details: { type: string; values: string[] } }> & {
			is_account_found: boolean;
		}
	>({
		success: true,
		code: 200,
		is_account_found: !isNewRegistration,
		data: {
			otp_details: {
				type: "email",
				values: [sentToEmail || resolveConsumerEmail(consumer)],
			},
		},
	});
});
