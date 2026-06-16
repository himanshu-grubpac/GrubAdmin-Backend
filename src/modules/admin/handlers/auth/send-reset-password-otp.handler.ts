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

		if (!admin) {
			// Return a generic success — do NOT reveal whether this email exists.
			// Returning 404 allows attackers to enumerate valid admin email addresses.
			return context.json<APIResponse>({ success: true, code: 200 }, 200);
		}

		const sentOtp = await getSavedOtp(normalizedEmail);

		if (sentOtp) {
			throw new APIError(
				"Otp has already been sent try resending the otp",
				undefined,
				undefined,
				400,
			);
		}

		const otp = Otp.generateOtp(4); // 4 digits = 10,000 combinations

				await saveOtp({
					email: normalizedEmail,
					otp,
					role: admin.type,
					for_what: "forget_password",
					is_password_reset: true,
				});

		await services.mailer.sendEmail({
			from: process.env.MAIL ?? "",  // Use configured mail env var, not a hardcoded personal address
			subject: "Reset Password OTP",
			to: normalizedEmail,
			text: `Your OTP for resetting your password is ${otp}`,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);

