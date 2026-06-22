import { createHandlers } from "@/utils/hono-factory.ts";
import { sendOtpRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import {
	getSavedMedicalEmployeeOtp,
	saveMedicalEmployeeOtp,
} from "@/db/actions/medical-otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";

export const resendOtpHandler = createHandlers(
	sendOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const employee = await getUniqueMedicalEmployee({ email });

		if (!employee) {
			throw new APIError(undefined, "medical.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (employee.type === ("delivery" as any) || employee.type === ("driver" as any)) {
			throw new APIError(undefined, "medical.auth.login.UNAUTHORIZED");
		}

		if (employee.employee.status !== "active" && employee.employee.status !== "inactive" && employee.employee.status !== ("unassigned" as any)) {
			throw new APIError(undefined, "medical.auth.login.ACCOUNT_INACTIVE");
		}

		const employeeEmail = employee.employee.email;
		if (!employeeEmail) {
			throw new APIError(undefined, "medical.auth.login.EMAIL_NOT_FOUND");
		}

		let savedOtp = null;
		if (target_otp_id) {
			savedOtp = await getSavedMedicalEmployeeOtp(employeeEmail, target_otp_id);
		} else {
			savedOtp = await getSavedMedicalEmployeeOtp(employeeEmail);
		}

		if (savedOtp) {
			const timeDiff = Date.now() - new Date(savedOtp.createdAt).getTime();
			const cooldown = 60000;
			if (timeDiff < cooldown) {
				throw new APIError("Please wait 60 seconds before requesting a new OTP.", undefined, undefined, 429);
			}
		}

		const otp = Otp.generateOtp(4);

		const updatedOtpRecord = await saveMedicalEmployeeOtp({
			otp_id: savedOtp?.otp_id,
			email: employeeEmail,
			otp,
			role: employee.type,
			for_what: "login",
		});

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "medical.auth.login.OTP_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Medical Portal - Resend OTP",
			to: employeeEmail,
			text: `Your OTP to log into your medical platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: login-resend`,
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
