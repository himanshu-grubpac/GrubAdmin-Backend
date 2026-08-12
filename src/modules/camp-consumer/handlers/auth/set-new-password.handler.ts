import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "@/modules/camp-consumer/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import {
	getUniqueCampingConsumer,
	setCampingConsumerPassword,
} from "@/db/actions/camp-consumer/consumer.actions";
import type { APIResponse } from "@/types/api";
import { JWT } from "@/utils/jwt.ts";
import {
	compareCampingConsumerOtp,
	deleteSavedCampingConsumerOtp,
	getSavedCampingConsumerOtp,
} from "@/db/actions/camping-consumer-otp.actions.ts";
import { assertCampingConsumer, resolveConsumerEmail } from "./auth.utils.ts";

/**
 * POST /auth/set-password
 * Set Details: name, email, phone + password (self-serve registration completion).
 */
export const setNewPasswordHandler = createHandlers(
	setNewPasswordRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");
		const { password, email, phone, country_code, full_name } = body;
		const bodyToken = body.auth_token || body["auth-token"] || body.token;

		let userId: string | undefined;

		if (context.req.header("Authorization")?.startsWith("Bearer ")) {
			const token = context.req.header("Authorization")!.slice(7).trim();
			if (!token) {
				throw new APIError("Authentication token is required!", undefined, undefined, 401);
			}
			const decoded = JWT.verifyCampingAuthToken(token);
			userId = decoded.id;
		} else if (bodyToken) {
			try {
				const decoded = JWT.verifyCampingAuthToken(bodyToken);
				userId = decoded.id;
			} catch (error) {
				if (error instanceof APIError) throw error;

				if (!email && !phone) {
					throw new APIError(
						"Email or phone is required for OTP-based reset!",
						undefined,
						undefined,
						400,
					);
				}

				const consumerForOtp = await getUniqueCampingConsumer({ email, phone, country_code });
				assertCampingConsumer(consumerForOtp);
				const consumerEmail = resolveConsumerEmail(consumerForOtp);

				const savedOtp = await getSavedCampingConsumerOtp(consumerEmail);
				const isOtpValid = savedOtp ? await compareCampingConsumerOtp(bodyToken, savedOtp.otp) : false;
				if (!savedOtp || !isOtpValid) {
					throw new APIError("Invalid OTP token", undefined, undefined, 401);
				}

				userId = consumerForOtp.id;
			}
		} else {
			throw new APIError(
				"Authentication token or email/token pair is required!",
				undefined,
				undefined,
				401,
			);
		}

		const consumer = await getUniqueCampingConsumer({ id: userId });
		assertCampingConsumer(consumer);

		await setCampingConsumerPassword({
			id: consumer.id,
			password,
			full_name,
			email,
			phone,
			country_code,
			activate: true,
		});

		await deleteSavedCampingConsumerOtp(resolveConsumerEmail(consumer));

		return context.json<APIResponse>({
			success: true,
			code: 200,
			message: "Password set successfully",
		});
	},
);
