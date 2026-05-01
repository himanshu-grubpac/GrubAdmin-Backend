import { createHandlers } from "@/utils/hono-factory.ts";
import { confirmResetPasswordRequestBodyValidator } from "@/modules/admin/validators/auth.validators.ts";
import { getSavedOtp, compareOtp, deleteSavedOtp } from "@/db/actions/otp.actions.ts";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import { setAuthCookie } from "@/utils/cookie.ts";
import { JWT_ACCESS_TOKEN_EXPIRY } from "@/configs/env.ts";
import { getUniqueAdmin, updateAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";

export const confirmResetPasswordHandler = createHandlers(
	confirmResetPasswordRequestBodyValidator,
	async (context) => {
		const { email, otp, password } = context.req.valid("json");

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			context.req.header("cf-connecting-ip") ||
			"unknown";

		
		const isLocked = await isOtpAttemptLocked({ email, ip_address });
		if (isLocked) {
			const remainingMinutes = await getOtpLockoutRemaining({ email, ip_address });
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429
			);
		}

		const savedOtp = await getSavedOtp(email);

		if (!savedOtp || !savedOtp.is_password_reset) {
			
			await incrementOtpAttempt({ email, ip_address });
			throw new APIError(
				"The password is either expired or was never sent!",
				undefined,
				undefined,
				400,
			);
		}

		const isValidOtp = await compareOtp(otp, savedOtp.otp);

		if (!isValidOtp) {
			
			await incrementOtpAttempt({ email, ip_address });
			throw new APIError("The otp is invalid", undefined, undefined, 400);
		}

		
		await resetOtpAttempt({ email, ip_address });

		const admin = await getUniqueAdmin({ email });

		if (!admin || !admin.user.password) {
			throw new APIError("Admin not found or password not set", undefined, undefined, 404);
		}

		
		const isSamePassword = await Bcrypt.compareHash({
			data: password,
			hashedValue: admin.user.password,
		});

		if (isSamePassword) {
			throw new APIError(
				"New password must be different from your old password!",
				undefined,
				undefined,
				400,
			);
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		await updateAdmin({
			email,
			data: {
				password: hashedPassword,
			},
		});

		await deleteSavedOtp(email);

		const token = JWT.signAuthToken({
			id: admin.user.id,
			role: admin.type,
		});

		setAuthCookie(context, token, { expiresIn: JWT_ACCESS_TOKEN_EXPIRY });

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);

