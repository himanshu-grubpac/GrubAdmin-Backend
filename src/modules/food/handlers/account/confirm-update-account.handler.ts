import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "food/validators/account.validators.ts";
import {
	deleteFoodEmployeeUpdateOtp,
	getFoodEmployeeUpdateOtp,
} from "@/db/actions/food-employe-update-otp.actions.ts";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { APIError } from "@/types/error";
import { updateVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

import { getCookie, deleteCookie } from "hono/cookie";

export const confirmUpdateAccountHandler = createHandlers(
	foodAuthGuard(),
	confirmUpdateAccountRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;

		const { otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			context.req.header("cf-connecting-ip") ||
			"unknown";

		const normalizedEmail = user.email ? user.email.trim().toLowerCase() : "unknown";

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

		const updatedDetails = await getFoodEmployeeUpdateOtp(user.id, target_otp_id);

		if (!updatedDetails) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(undefined, "food.account.NO_CHANGE_REQUESTS", undefined, 400);
		}

		// Verify hashed OTP
		const isMatch = await Bcrypt.compareHash({
			data: otp,
			hashedValue: updatedDetails.otp,
		});

		if (!isMatch) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 400);
		}

		// Reset brute force count on successful verification
		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		// Build the update payload — applied to correct table via type
		const updateData: any = {
			id: user.id,
			type,
		};

		if (updatedDetails.email) updateData.email = updatedDetails.email;
		if (updatedDetails.mobile_number)
			updateData.mobile_number = updatedDetails.mobile_number;
		if (updatedDetails.country_code)
			updateData.country_code = updatedDetails.country_code;
		if (updatedDetails.first_name)
			updateData.first_name = updatedDetails.first_name;
		if (updatedDetails.last_name !== null && updatedDetails.last_name !== undefined)
			updateData.last_name = updatedDetails.last_name;

		// organization_name → mapped to "organization" arg → updates client.organization_name
		if (updatedDetails.organization_name)
			updateData.organization = updatedDetails.organization_name;

		// updateVerticalFoodEmployee routes to client or vertical_food_employee based on type
		await updateVerticalFoodEmployee(updateData);

		await deleteFoodEmployeeUpdateOtp(user.id);

		// Cleanly delete the cookie instead of re-setting it
		deleteCookie(context, "otp_id", { path: "/" });

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.employee.profile.UPDATE_SUCCESS", { id: user.id }),
			is_otp: false,
			has_changed: true,
			message_debug: "The OTP has been successfully verified, and the requested changes have been applied.",
			data: {
				otp_id: target_otp_id,
			},
		};

		return context.json(response as any, response.code as any);
	},
);

