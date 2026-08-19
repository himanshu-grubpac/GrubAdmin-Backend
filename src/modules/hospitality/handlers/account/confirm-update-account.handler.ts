import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { confirmUpdateAccountRequestBodyValidator } from "hospitality/validators/account.validators.ts";
import {
	deleteDeliveryEmployeeUpdateOtp,
	getDeliveryEmployeeUpdateOtp,
} from "@/db/actions/delivery-employee-update-otp.actions.ts";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/hospitality-otp-attempt.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { APIError } from "@/types/error";
import { resolveMessageTemplate } from "@/utils/message";
import { getCookie, deleteCookie } from "hono/cookie";
import { updateHospitalityAccountProfile } from "@/db/actions/hospitality/employee.actions";
import { getHospitalityUserOtpLockKey } from "hospitality/handlers/auth/hospitality-otp-lockout";

export const confirmUpdateAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	confirmUpdateAccountRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;

		const { otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const lockKey = getHospitalityUserOtpLockKey(user.id, user.email);

		const isLocked = await isOtpAttemptLocked(lockKey);
		if (isLocked) {
			const remainingMinutes = await getOtpLockoutRemaining(lockKey);
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const updatedDetails = await getDeliveryEmployeeUpdateOtp(user.id, target_otp_id);

		if (!updatedDetails) {
			await incrementOtpAttempt(lockKey);
			throw new APIError(undefined, "hospitality.account.NO_CHANGE_REQUESTS", undefined, 400);
		}

		const isMatch = await Bcrypt.compareHash({
			data: otp,
			hashedValue: updatedDetails.otp,
		});

		if (!isMatch) {
			await incrementOtpAttempt(lockKey);
			throw new APIError(undefined, "hospitality.auth.login.OTP_INVALID", undefined, 400);
		}

		await resetOtpAttempt(lockKey);

		const pendingPassword =
			updatedDetails.last_name &&
			typeof updatedDetails.last_name === "string" &&
			updatedDetails.last_name.startsWith("$2")
				? updatedDetails.last_name
				: undefined;

		await updateHospitalityAccountProfile({
			id: user.id,
			type,
			first_name: updatedDetails.first_name ?? undefined,
			last_name:
				updatedDetails.last_name && !pendingPassword
					? updatedDetails.last_name
					: undefined,
			organization: updatedDetails.organization_name ?? undefined,
			email: updatedDetails.email ?? undefined,
			country_code: updatedDetails.country_code ?? undefined,
			mobile_number: updatedDetails.mobile_number ?? undefined,
			password: pendingPassword,
			increment_auth_token_version: !!pendingPassword && type === "admin",
		});

		await deleteDeliveryEmployeeUpdateOtp(user.id);
		deleteCookie(context, "otp_id", { path: "/" });

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.employee.profile.UPDATE_SUCCESS", { id: user.id }),
			is_otp: false,
			has_changed: true,
			message_debug:
				"The OTP has been successfully verified, and the requested changes have been applied.",
			data: {
				otp_id: target_otp_id,
			},
		};

		return context.json(response as any, response.code as any);
	},
);
