import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "@/modules/admin/validators/account.validators.ts";
import {
	deleteAdminUpdateOtp,
	getAdminUpdateOtp,
} from "@/db/actions/admin-update-otp.actions.ts";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions.ts";
import { APIError } from "@/types/error";
import { updateAdmin } from "@/db/actions/admin.actions.ts";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";

export const confirmUpdateAccountHandler = createHandlers(
	authGuard(["admin", "employee"]),
	confirmUpdateAccountRequestBodyValidator,
	async (context) => {
		const { user_id, admin } = context.var;

		const { otp } = context.req.valid("json");

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			context.req.header("cf-connecting-ip") ||
			"unknown";

		const normalizedEmail = admin?.email
			? admin.email.trim().toLowerCase()
			: "unknown";

		const isLocked = await isOtpAttemptLocked({ email: normalizedEmail, ip_address });
		if (isLocked) {
			const remainingMinutes = await getOtpLockoutRemaining({
				email: normalizedEmail,
				ip_address,
			});
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const updateDetails = await getAdminUpdateOtp(user_id);

		if (!updateDetails) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(
				"Either the OTP was never created or maybe has expired!",
				undefined,
				undefined, 400,
			);
		}

		const isOtpValid = await Bcrypt.compareHash({
			data: otp,
			hashedValue: updateDetails.otp,
		});

		if (!isOtpValid) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP", undefined, undefined, 400);
		}

		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		if (updateDetails.email) {
			await updateAdmin({
				id: user_id,
				data: {
					email: updateDetails.email,
				},
			});
		} else if (updateDetails.mobile_number && updateDetails.country_code) {
			await updateAdmin({
				id: user_id,
				data: {
					mobile_number: updateDetails.mobile_number,
					country_code: updateDetails.country_code,
				},
			});
		}

		await deleteAdminUpdateOtp(user_id);

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
