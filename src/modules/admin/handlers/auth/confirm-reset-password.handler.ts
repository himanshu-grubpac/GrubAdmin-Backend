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
import { getUniqueAdmin, updateAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";

export const confirmResetPasswordHandler = createHandlers(
	confirmResetPasswordRequestBodyValidator,
	async (context) => {
		const { email, otp, password } = context.req.valid("json");
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

		if (!savedOtp || !savedOtp.is_password_reset) {
			
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(
				"The password is either expired or was never sent!",
				undefined,
				undefined,
				400,
			);
		}

		const isValidOtp = await compareOtp(otp, savedOtp.otp);

		if (!isValidOtp) {
			
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("The otp is invalid", undefined, undefined, 400);
		}

		
		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		const admin = await getUniqueAdmin({ email: normalizedEmail });

		if (!admin) {
			throw new APIError("Admin not found", undefined, undefined, 404);
		}

		if (admin.user.status === "suspended") {
			throw new APIError(
				"Your account is suspended. Password reset is not allowed.",
				undefined,
				undefined,
				403,
			);
		}

		if (admin.user.password) {
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
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		await updateAdmin({
			email: normalizedEmail,
			data: {
				password: hashedPassword,
			},
		});

		await deleteSavedOtp(normalizedEmail);

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

