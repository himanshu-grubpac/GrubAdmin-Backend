import { createHandlers } from "@/utils/hono-factory.ts";
import { sendOtpRequestBodyValidator } from "delivery/validators/auth.validators.ts";
import { resolveVerticalDeliveryEmployeeForEmailAuth } from "@/db/actions/vertical-delivery-employee.actions";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import {
	getSavedDeliveryEmployeeOtp,
	saveDeliveryEmployeeOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";

export const sendOtpHandler = createHandlers(
	sendOtpRequestBodyValidator,
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
				);
			}
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND");
		}

		const employee = resolved.employee;

		if (employee.type === "delivery" || employee.type === ("driver" as any)) {
			throw new APIError(undefined, "delivery.auth.login.UNAUTHORIZED");
		}

		if (
			employee.employee.status !== "active" &&
			employee.employee.status !== "inactive" &&
			employee.employee.status !== ("unassigned" as any)
		) {
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_INACTIVE");
		}

		// Always use the email from the DB record (correct table: client or vertical_delivery_employee)
		const employeeEmail = employee.employee.email;
		if (!employeeEmail) {
			throw new APIError(undefined, "delivery.auth.login.EMAIL_NOT_FOUND");
		}

		let savedOtp = null;
		if (target_otp_id) {
			savedOtp = await getSavedDeliveryEmployeeOtp(employeeEmail, target_otp_id);
		} else {
			savedOtp = await getSavedDeliveryEmployeeOtp(employeeEmail);
		}

		if (savedOtp) {
			const timeDiff = Date.now() - new Date(savedOtp.createdAt).getTime();
			const cooldown = 60000; // 60 seconds cooldown
			if (timeDiff < cooldown) {
				throw new APIError("Please wait 60 seconds before requesting a new OTP.", undefined, undefined, 429);
			}
		}

		const otp = Otp.generateOtp(4);

		const updatedOtpRecord = await saveDeliveryEmployeeOtp({
			otp_id: savedOtp?.otp_id,
			email: employeeEmail,
			otp,
			role: employee.type,
			for_what: "login",
		});

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "delivery.auth.login.OTP_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5, // 5 minutes
			sameSite: "Lax",
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Delivery Portal - Login OTP",
			to: employeeEmail,
			text: `Your OTP to log into your delivery platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: login-send`,
		});

		return context.json<APIResponse<{ otp_id: string; otp_details: { type: string; values: string[] } }>>({
			success: true,
			code: 200,
			data: {
				otp_id,
				otp_details: {
					type: "email",
					values: [employeeEmail],
				},
			},
		});
	},
);


