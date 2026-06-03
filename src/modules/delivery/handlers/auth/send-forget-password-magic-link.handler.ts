import { createHandlers } from "@/utils/hono-factory.ts";
import { sendForgetPasswordMagicLinkRequestBodyValidator } from "delivery/validators/auth.validators.ts";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { APIError } from "@/types/error";
import { getSavedOtp, saveOtp } from "@/db/actions/otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { Otp } from "@/utils/otp.ts";
import crypto from "crypto";
import { getCookie, setCookie } from "hono/cookie";

export const sendForgetPasswordMagicLinkHandler = createHandlers(
	sendForgetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");

		const employee = await getUniqueVerticalDeliveryEmployee({
			email,
		});

		if (!employee) {
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "delivery.auth.login.SUSPENDED");
		}

		// Always use the email from the DB record (correct table: client or vertical_delivery_employee)
		const employeeEmail = employee.employee.email;
		if (!employeeEmail) {
			throw new APIError(undefined, "delivery.auth.login.EMAIL_NOT_FOUND");
		}


		// Generate a unique token for password reset
		const token = crypto.randomBytes(32).toString("hex");

		const updatedOtpRecord = await saveOtp({
			otp_id: undefined,
			email: employeeEmail,
			otp: token,
			role: (employee.type === "admin" ? "admin" : (employee.type === "manager" ? "manager" : "delivery")) as any,
			for_what: "forget_password",
		});

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "delivery.auth.login.MAGIC_LINK_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;

		// Create reset password URL
		const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(employeeEmail)}&link_id=${otp_id}`;

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Delivery Portal - Reset Password Link",
			to: employeeEmail,
			text: `Click the link below to reset your password (LINK_ID: ${otp_id}):\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nfor_what: forget-send`,
		});

		return context.json<APIResponse<{ link_id: string }>>({
			success: true,
			code: 200,
			data: {
				link_id: otp_id,
			},
		});
	},
);


