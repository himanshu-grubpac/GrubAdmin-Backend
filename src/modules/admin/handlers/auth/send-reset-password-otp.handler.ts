import { createHandlers } from "@/utils/hono-factory.ts";
import { sendPasswordResetOtpRequestBodyValidator } from "@/modules/admin/validators/auth.validators.ts";
import { getUniqueAdmin } from "@/db/actions/admin.actions.ts";
import { APIError } from "@/types/error";
import { getSavedOtp, saveOtp } from "@/db/actions/otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import type { APIResponse } from "@/types/api";
import { services } from "@/services";

export const sentResetPasswordOtpHandler = createHandlers(
	sendPasswordResetOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const admin = await getUniqueAdmin({
			email: normalizedEmail,
		});

		if (admin) {
			const sentOtp = await getSavedOtp(normalizedEmail);

			if (!sentOtp) {
				const otp = Otp.generateOtp(4);

				await saveOtp({
					email: normalizedEmail,
					otp,
					role: admin.type,
					for_what: "forget_password",
					is_password_reset: true,
				});

				await services.mailer.sendEmail({
					from: "ankan@sqaby.com",
					subject: "Reset Password OTP",
					to: normalizedEmail,
					text: `Your OTP for resetting your password is ${otp}`,
				});
			}
		}

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);

