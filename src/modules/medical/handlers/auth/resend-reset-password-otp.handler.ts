import { createHandlers } from "@/utils/hono-factory.ts";
import { resendPasswordResetOtpRequestBodyValidator } from "medical/validators/auth.validators.ts";
import {
	getSavedMedicalEmployeeOtp,
	saveMedicalEmployeeOtp,
} from "@/db/actions/medical-otp.actions.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const resendResetPasswordOtpHandler = createHandlers(
	resendPasswordResetOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const savedOtp = await getSavedMedicalEmployeeOtp(normalizedEmail);

		if (!savedOtp?.metadata?.is_password_reset) {
			throw new APIError("Please first send the otp to resend otp", undefined, undefined, 400);
		}

		const otp = Otp.generateOtp(4);

		await saveMedicalEmployeeOtp({
			otp_id: savedOtp.otp_id,
			email: normalizedEmail,
			otp,
			role: savedOtp.role,
			for_what: "forget_password",
			metadata: { is_password_reset: true },
		});

		await services.mailer.sendEmail({
			from: process.env.MAIL ?? "",
			subject: "Reset Password OTP",
			to: normalizedEmail,
			text: `Your OTP for resetting your password is ${otp}`,
		});

		return context.json<APIResponse>({ success: true, code: 200 });
	},
);
