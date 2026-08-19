import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import {
	getDeliveryEmployeeUpdateOtp,
	upsertVerticalDeliveryUpdateOtp,
} from "@/db/actions/delivery-employee-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { Bcrypt } from "@/utils/bcrypt.ts";

import { resendUpdateAccountOtpRequestBodyValidator } from "hospitality/validators/account.validators.ts";
import { getCookie, setCookie } from "hono/cookie";
import {
	getHospitalityMailFrom,
	logHospitalityOtpDev,
} from "hospitality/handlers/auth/auth.utils";

export const updateAccountResendOtpHandler = createHandlers(
	hospitalityAuthGuard(),
	resendUpdateAccountOtpRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;
		const { otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const oldEmployeeUpdateOtp = await getDeliveryEmployeeUpdateOtp(user.id, target_otp_id);

		if (!oldEmployeeUpdateOtp) {
			throw new APIError(
				"No OTP for change request has been initiated yet.",
				undefined,
				undefined,
				400,
			);
		}

		const updatedAt = (oldEmployeeUpdateOtp as any).updatedAt || (oldEmployeeUpdateOtp as any).updated_at || oldEmployeeUpdateOtp.createdAt;
		const secondsSinceLastSend = (Date.now() - new Date(updatedAt).getTime()) / 1000;
		if (secondsSinceLastSend < 60) {
			throw new APIError(
				`Please wait ${Math.ceil(60 - secondsSinceLastSend)} seconds before resending another OTP.`,
				"hospitality.auth.login.OTP_COOLDOWN",
				undefined,
				429
			);
		}

		const otp = Otp.generateOtp(4);
		const hashedOtp = await Bcrypt.generateHash({ data: otp });

		const updatedOtpRecord = await upsertVerticalDeliveryUpdateOtp({
			otp_id: oldEmployeeUpdateOtp.otp_id,
			user_id: user.id,
			otp: hashedOtp,
			email: oldEmployeeUpdateOtp.email ?? undefined,
			role: type === "admin" ? "admin" : "manager",
		});

		if (!updatedOtpRecord) {
			throw new APIError("Failed to update OTP", undefined, undefined, 500);
		}

		const otp_id = updatedOtpRecord.otp_id;

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		const otpRecipient = oldEmployeeUpdateOtp.email || user.email || "";
		logHospitalityOtpDev({
			email: otpRecipient,
			otp,
			otp_id,
			for_what: "account-update-resend",
		});

		try {
			await services.mailer.sendEmail({
				from: getHospitalityMailFrom(),
				subject: "OTP for Account Update",
				to: otpRecipient,
				text: `Your OTP to update hospitality account is ${otp} (OTP Session ID: ${otp_id})`,
			});
		} catch {
			throw new APIError(undefined, "hospitality.auth.login.OTP_SEND_FAILED");
		}

		const otpType =
			oldEmployeeUpdateOtp.mobile_number && oldEmployeeUpdateOtp.email
				? "both"
				: oldEmployeeUpdateOtp.mobile_number
					? "phone"
					: "email";

		return context.json<
			APIResponse<{ otp_id: string; otp_details: { type: string; values: string[] } }> & {
				is_otp: boolean;
				has_changed: boolean;
				message_debug: string;
			}
		>({
			success: true,
			code: 200,
			is_otp: true,
			has_changed: true,
			message_debug: "A new verification OTP has been generated, and the OTP has been successfully delivered.",
			data: {
				otp_id,
				otp_details: {
					type: otpType,
					values: [oldEmployeeUpdateOtp.email!],
				},
			},
		});
	},
);
