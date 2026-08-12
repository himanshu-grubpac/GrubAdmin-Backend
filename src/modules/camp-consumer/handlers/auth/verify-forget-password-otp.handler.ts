import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import {
	compareCampingConsumerOtp,
	deleteSavedCampingConsumerOtp,
	getSavedCampingConsumerOtp,
} from "@/db/actions/camping-consumer-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueCampingConsumer } from "@/db/actions/camp-consumer/consumer.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { assertCampingConsumer, buildCampingAuthPayload, resolveConsumerEmail } from "./auth.utils.ts";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
}

export const verifyForgetPasswordOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, phone, country_code, otp } = context.req.valid("json");

		const consumer = await getUniqueCampingConsumer({ email, phone, country_code });
		assertCampingConsumer(consumer);

		const consumerEmail = resolveConsumerEmail(consumer);
		const savedOtp = await getSavedCampingConsumerOtp(consumerEmail);

		if (!savedOtp) {
			throw new APIError("OTP expired or invalid", undefined, undefined, 400);
		}

		const for_what = savedOtp.for_what;
		const isOtpValid = await compareCampingConsumerOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError("Invalid otp", undefined, undefined, 400);
		}

		if (savedOtp.for_what !== "forget_password") {
			throw new APIError("Invalid otp purpose", undefined, undefined, 401);
		}

		await deleteSavedCampingConsumerOtp(consumerEmail);

		const token = JWT.signCampingAuthToken({
			...buildCampingAuthPayload(consumer),
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			message: "OTP verified successfully",
			data: {
				auth_token: token,
				otp_for_what: for_what,
			},
		});
	},
);
