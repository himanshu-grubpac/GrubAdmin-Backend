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
} from "@/db/actions/otp-attempt.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { getCookie, deleteCookie } from "hono/cookie";
import { prisma } from "@/db";
import { syncVerticalEmailRegistry } from "@/utils/vertical-email-registry";

export const confirmUpdateAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	confirmUpdateAccountRequestBodyValidator,
	async (context) => {
		const { user, vertical_id } = context.var;

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

		const updatedDetails = await getDeliveryEmployeeUpdateOtp(user.id, target_otp_id);

		if (!updatedDetails) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(undefined, "hospitality.account.NO_CHANGE_REQUESTS", undefined, 400);
		}

		const isMatch = await Bcrypt.compareHash({
			data: otp,
			hashedValue: updatedDetails.otp,
		});

		if (!isMatch) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(undefined, "hospitality.auth.login.OTP_INVALID", undefined, 400);
		}

		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		const updatePayload: any = {};
		if (updatedDetails.email) updatePayload.email = updatedDetails.email;
		if (updatedDetails.mobile_number) updatePayload.mobile_number = updatedDetails.mobile_number;
		if (updatedDetails.country_code) updatePayload.country_code = updatedDetails.country_code;

		await prisma.client.update({
			where: { id: user.id },
			data: updatePayload,
		});

		if (updatedDetails.email && vertical_id) {
			await syncVerticalEmailRegistry({
				verticalId: vertical_id,
				email: updatedDetails.email,
				ownerType: "client",
				ownerId: user.id,
			});
		}

		await deleteDeliveryEmployeeUpdateOtp(user.id);

		deleteCookie(context, "otp_id", { path: "/" });

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.employee.profile.UPDATE_SUCCESS", { id: user.id }),
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
