import { createHandlers } from "@/utils/hono-factory.ts";
import { resendOtpRequestBodyValidator } from "delivery/validators/auth.validators.ts";
import { resolveVerticalDeliveryEmployeeForEmailAuth } from "@/db/actions/vertical-delivery-employee.actions";
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

export const resendOtpHandler = createHandlers(
	resendOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const resolved = await resolveVerticalDeliveryEmployeeForEmailAuth(email);

		if (!resolved.ok) {
			if (resolved.reason === "ambiguous_account") {
				throw new APIError(
					"Multiple accounts match this email. Contact support.",
					"delivery.auth.login.INVALID_CREDENTIALS",
					undefined,
					400,
				);
			}
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		const employee = resolved.employee;

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "delivery.auth.login.SUSPENDED", undefined, 403);
		}

		// Always use the email from the DB record (correct table: client or vertical_delivery_employee)
		const employeeEmail = employee.employee.email;
		if (!employeeEmail) {
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		let sentOtp = await getSavedDeliveryEmployeeOtp(employeeEmail, target_otp_id);
		let isForgotPassword = false;

		if (!sentOtp) {
			const { getSavedOtp } = await import("@/db/actions/otp.actions.ts");
			sentOtp = (await getSavedOtp(employeeEmail, target_otp_id)) as any;
			isForgotPassword = true;
		}

		if (!sentOtp) {
			throw new APIError(undefined, "delivery.auth.login.OTP_EXPIRED", undefined, 400);
		}

		// Enforce cooldown check
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
				email: employeeEmail,
				otp: token,
				role: (employee.type === "admin" ? "admin" : (employee.type === "manager" ? "manager" : "delivery")) as any,
				for_what: "forget_password",
			});
			if (!updatedOtpRecord) {
				throw new APIError("Failed to update OTP", undefined, undefined, 500);
			}
			otp_id = updatedOtpRecord.otp_id;

			const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(employeeEmail)}&link_id=${otp_id}`;
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "Delivery Portal - Reset Password Link",
				to: employeeEmail,
				text: `Click the link below to reset your password (LINK_ID: ${otp_id}):\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nfor_what: forget-resend`,
			});
		} else {
			const updatedOtpRecord = await saveDeliveryEmployeeOtp({
				otp_id: sentOtp.otp_id,
				email: employeeEmail,
				otp,
				role: employee.type,
				for_what: sentOtp.for_what,
			});
			if (!updatedOtpRecord) {
				throw new APIError("Failed to update OTP", undefined, undefined, 500);
			}
			otp_id = updatedOtpRecord.otp_id;

			const for_what = `${sentOtp.for_what === "forget_password" ? "forget" : sentOtp.for_what}-resend`;
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "Delivery Portal - Login OTP",
				to: employeeEmail,
				text: `Your OTP to log into your delivery platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: ${for_what}`,
			});
		}

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5, // 5 minutes
			sameSite: "Lax",
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.auth.login.OTP_SENT"),
			data: {
				otp_id,
				otp_details: {
					type: "email",
					values: [employeeEmail],
				},
			},
		};

		return context.json(response as any, response.code as any);
	},
);


