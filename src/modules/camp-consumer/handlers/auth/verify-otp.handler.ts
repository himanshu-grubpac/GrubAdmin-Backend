import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import {
	compareCampingConsumerOtp,
	deleteSavedCampingConsumerOtp,
	getSavedCampingConsumerOtp,
} from "@/db/actions/camping-consumer-otp.actions.ts";
import { APIError } from "@/types/error";
import {
	activateCampingConsumer,
	getUniqueCampingConsumer,
} from "@/db/actions/camp-consumer/consumer.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import {
	assertCampingConsumer,
	buildCampingAuthPayload,
	getConsumerClientId,
	resolveConsumerEmail,
} from "./auth.utils.ts";

interface ResponseData {
	auth_token: string;
	refresh_token?: string;
	otp_for_what: string;
	is_password_set: boolean;
}

export const verifyOtpHandler = createHandlers(verifyOtpRequestBodyValidator, async (context) => {
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

	if (savedOtp.for_what !== "login" && savedOtp.for_what !== "register") {
		throw new APIError("Invalid otp purpose", undefined, undefined, 401);
	}

	await deleteSavedCampingConsumerOtp(consumerEmail);

	let activeConsumer = consumer;
	if (consumer.status === "pending") {
		activeConsumer = await activateCampingConsumer(consumer.id);
	}

	const payload = buildCampingAuthPayload(activeConsumer);
	const token = JWT.signCampingAuthToken(payload);
	const refreshToken = JWT.signCampingRefreshToken(payload);

	return context.json<APIResponse<ResponseData>>({
		success: true,
		code: 200,
		client_id: getConsumerClientId(activeConsumer),
		data: {
			auth_token: token,
			refresh_token: refreshToken,
			otp_for_what: for_what,
			is_password_set: !!activeConsumer.password,
		},
	});
});
