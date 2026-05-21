import { createHandlers } from "@/utils/hono-factory";
import { verifyOtpRequestBodyValidator } from "../../validators/auth.validators";
import { deleteSavedOtp, getSavedOtp, compareOtp } from "@/db/actions/otp.actions";
import {
	getOtpAttempt,
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions";
import { APIError } from "@/types/error";
import { getUniqueAdmin, updateAdmin } from "@/db/actions/admin.actions";
import { JWT } from "@/utils/jwt";
import { setAuthCookie } from "@/utils/cookie";
import { JWT_ACCESS_TOKEN_EXPIRY } from "@/configs/env";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message.ts";

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			context.req.header("cf-connecting-ip") ||
			"unknown";

		const isLocked = await isOtpAttemptLocked({ email: normalizedEmail, ip_address });
		if (isLocked) {
			const remainingMinutes = await getOtpLockoutRemaining({ email: normalizedEmail, ip_address });
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429
			);
		}

		const savedOtp = await getSavedOtp(normalizedEmail);

		if (!savedOtp) {

			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(undefined, "admin.auth.OTP_EXPIRED", undefined, 400);
		}

		const isValidOtp = await compareOtp(otp, savedOtp.otp);

		if (!isValidOtp) {

			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(undefined, "admin.auth.OTP_INVALID", undefined, 400);
		}


		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		await deleteSavedOtp(normalizedEmail);

		const admin = await getUniqueAdmin({
			email: normalizedEmail,
		});

		if (!admin) {
			throw new APIError(undefined, "admin.auth.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (admin.user.status === "suspended") {
			throw new APIError(undefined, "admin.auth.UNAUTHORIZED", undefined, 403);
		}

		if (admin.user.status === "unassigned") {
			await updateAdmin({
				email: normalizedEmail,
				data: {
					status: "active",
				},
			});
		}

		const token = JWT.signAuthToken({
			id: admin.user.id,
			role: admin.type,
		});

		// Set JWT token as HttpOnly Secure cookie
		setAuthCookie(context, token, { expiresIn: JWT_ACCESS_TOKEN_EXPIRY });

		const response = {
			success: true as const,
			data: { token },
			...resolveMessageTemplate("admin.auth.login.SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);

