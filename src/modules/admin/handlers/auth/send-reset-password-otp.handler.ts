import { createHandlers } from "@/utils/hono-factory.ts";
import { sendPasswordResetOtpRequestBodyValidator } from "@/modules/admin/validators/auth.validators.ts";
import { getUniqueAdmin } from "@/db/actions/admin.actions.ts";
import { saveOtp } from "@/db/actions/otp.actions.ts";
import type { APIResponse } from "@/types/api";
import { services } from "@/services";
import { FRONTEND_URL, MAIL } from "@/configs/env.ts";
import crypto from "crypto";

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

		const token = crypto.randomBytes(32).toString("hex");

		const updatedOtpRecord = await saveOtp({
			email: normalizedEmail,
			otp: token,
			role: admin.type,
			for_what: "forget_password",
			is_password_reset: true,
		});

		if (!updatedOtpRecord) {
			return context.json<APIResponse>({ success: true, code: 200 }, 200);
		}

		if (!FRONTEND_URL) {
			throw new Error("FRONTEND_URL is required for reset password links.");
		}

		const otp_id = updatedOtpRecord.otp_id;
		const resetUrl = `${FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}&link_id=${otp_id}`;

		await services.mailer.sendEmail({
			from: MAIL,
			subject: "Reset Password Link",
			to: normalizedEmail,
			text: `Click the link below to reset your password (LINK_ID: ${otp_id}):\n${resetUrl}\n\nThis link will expire in 5 minutes.`,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);
