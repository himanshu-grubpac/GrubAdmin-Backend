import { createHandlers } from "@/utils/hono-factory.ts";
import { resendPasswordResetOtpRequestBodyValidator } from "@/modules/admin/validators/auth.validators.ts";
import { getSavedOtp, saveOtp } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const resendResetPasswordOtpHandler = createHandlers(
	resendPasswordResetOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");

		const savedOtp = await getSavedOtp(email);

		if (!savedOtp) {
			throw new APIError("Please first send the otp to resen otp", undefined, undefined, 400);
		}

		const otp = Otp.generateOtp(4);

		await saveOtp({
			email,
			otp,
			role: savedOtp.role,
			for_what: savedOtp.for_what,
			is_password_reset: true,
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Reset Password OTP",
			to: email,
			text: `Your OTP for resetting your password is ${otp}`,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);

