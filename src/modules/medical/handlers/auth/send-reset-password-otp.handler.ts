import { createHandlers } from "@/utils/hono-factory.ts";
import { sendPasswordResetOtpRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions.ts";
import { APIError } from "@/types/error";
import {
	getSavedMedicalEmployeeOtp,
	saveMedicalEmployeeOtp,
} from "@/db/actions/medical-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import type { APIResponse } from "@/types/api";
import { services } from "@/services";

export const sendResetPasswordOtpHandler = createHandlers(
	sendPasswordResetOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const employee = await getUniqueMedicalEmployee({ email: normalizedEmail });

		if (!employee) {
			return context.json<APIResponse>({ success: true, code: 200 }, 200);
		}

		const savedOtp = await getSavedMedicalEmployeeOtp(normalizedEmail);
		if (savedOtp?.metadata?.is_password_reset) {
			throw new APIError(
				"Otp has already been sent try resending the otp",
				undefined,
				undefined,
				400,
			);
		}

		const otp = Otp.generateOtp(4);

		await saveMedicalEmployeeOtp({
			email: normalizedEmail,
			otp,
			role: employee.type,
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
