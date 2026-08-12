import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import {
	compareCampingConsumerOtp,
	deleteSavedCampingConsumerOtp,
	getSavedCampingConsumerOtp,
} from "@/db/actions/camping-consumer-otp.actions.ts";
import { APIError } from "@/types/error";
import {
	getUniqueCampingConsumer,
	setCampingConsumerPassword,
} from "@/db/actions/camp-consumer/consumer.actions";
import type { APIResponse } from "@/types/api";
import { assertCampingConsumer, resolveConsumerEmail } from "./auth.utils.ts";

export const resetPasswordHandler = createHandlers(
	resetPasswordRequestBodyValidator,
	async (context) => {
		const { email, phone, country_code, otp, password } = context.req.valid("json");

		const consumer = await getUniqueCampingConsumer({ email, phone, country_code });
		assertCampingConsumer(consumer);

		const consumerEmail = resolveConsumerEmail(consumer);
		const savedOtp = await getSavedCampingConsumerOtp(consumerEmail);

		if (!savedOtp) {
			throw new APIError(
				"The otp has either expired or the credentials are wrong! Please try sending a new otp!",
				undefined,
				undefined,
				400,
			);
		}

		const isOtpValid = await compareCampingConsumerOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError("Invalid otp", undefined, undefined, 400);
		}

		await deleteSavedCampingConsumerOtp(consumerEmail);

		await setCampingConsumerPassword({
			id: consumer.id,
			password,
			activate: true,
		});

		return context.json<APIResponse>({ success: true, code: 200 });
	},
);
