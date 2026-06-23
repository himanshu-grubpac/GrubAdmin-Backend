import { createHandlers } from "@/utils/hono-factory.ts";
import { resendOtpRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import {
	getSavedDeliveryEmployeeOtp,
	saveDeliveryEmployeeOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import type { APIResponse } from "@/types/api";
import { services } from "@/services";
import { getCookie, setCookie } from "hono/cookie";
import { resolveMessageTemplate } from "@/utils/message.ts";
import { prisma } from "@/db";

export const resendOtpHandler = createHandlers(
	resendOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const clientRecord = await prisma.client.findFirst({
			where: { email },
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "hospitality.auth.login.SUSPENDED", undefined, 403);
		}

		const clientEmail = clientRecord.email;
		if (!clientEmail) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		let sentOtp = await getSavedDeliveryEmployeeOtp(clientEmail, target_otp_id);
		let isForgotPassword = false;

		if (!sentOtp) {
			const { getSavedOtp } = await import("@/db/actions/otp.actions.ts");
			sentOtp = (await getSavedOtp(clientEmail, target_otp_id)) as any;
			isForgotPassword = true;
		}

		if (!sentOtp) {
			throw new APIError(undefined, "hospitality.auth.login.OTP_EXPIRED", undefined, 400);
		}

		const timeDiff = Date.now() - new Date((sentOtp as any).createdAt).getTime();
		const cooldown = 60000;
		if (timeDiff < cooldown) {
			throw new APIError("Please wait 60 seconds before requesting a new OTP.", undefined, undefined, 429);
		}

		const otp = Otp.generateOtp(4);
		let otp_id: string;

		if (isForgotPassword) {
			const crypto = await import("crypto");
			const token = crypto.randomBytes(32).toString("hex");
			const { saveOtp } = await import("@/db/actions/otp.actions.ts");
			const updatedOtpRecord = await saveOtp({
				otp_id: sentOtp.otp_id,
				email: clientEmail,
				otp: token,
				role: "admin",
				for_what: "forget_password",
			});
			if (!updatedOtpRecord) {
				throw new APIError("Failed to update OTP", undefined, undefined, 500);
			}
			otp_id = updatedOtpRecord.otp_id;

			const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(clientEmail)}&link_id=${otp_id}`;
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "Hospitality Portal - Reset Password Link",
				to: clientEmail,
				text: `Click the link below to reset your password (LINK_ID: ${otp_id}):\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nfor_what: forget-resend`,
			});
		} else {
			const updatedOtpRecord = await saveDeliveryEmployeeOtp({
				otp_id: sentOtp.otp_id,
				email: clientEmail,
				otp,
				role: "admin",
				for_what: sentOtp.for_what,
			});
			if (!updatedOtpRecord) {
				throw new APIError("Failed to update OTP", undefined, undefined, 500);
			}
			otp_id = updatedOtpRecord.otp_id;

			const for_what = `${sentOtp.for_what === "forget_password" ? "forget" : sentOtp.for_what}-resend`;
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "Hospitality Portal - Login OTP",
				to: clientEmail,
				text: `Your OTP to log into your hospitality platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: ${for_what}`,
			});
		}

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		return context.json({
			success: true,
			...resolveMessageTemplate("hospitality.auth.login.OTP_SENT"),
			data: {
				otp_id,
				otp_details: {
					type: "email",
					values: [clientEmail],
				},
			},
		});
	},
);
