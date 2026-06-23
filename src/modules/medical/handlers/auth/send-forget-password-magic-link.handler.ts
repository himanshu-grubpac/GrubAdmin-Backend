import { createHandlers } from "@/utils/hono-factory.ts";
import { sendForgetPasswordMagicLinkRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { saveMedicalEmployeeOtp } from "@/db/actions/medical-otp.actions.ts";
import { services } from "@/services";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";

export const sendForgetPasswordMagicLinkHandler = createHandlers(
	sendForgetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email });

		if (!employee) {
			throw new APIError("No employee can be found!", "medical.auth.login.ACCOUNT_NOT_FOUND", { is_account_found: false });
		}

		if (!employee.employee.email) {
			throw new APIError("No email found for this account!", "medical.auth.login.EMAIL_NOT_FOUND");
		}

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", "medical.auth.login.SUSPENDED", {});
		}

		const token = Otp.generateOtp(6);

		await saveMedicalEmployeeOtp({
			email: employee.employee.email,
			otp: token,
			role: employee.type,
			for_what: "forget_password",
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Medical Portal - Password Reset",
			to: employee.employee.email,
			text: `Use this token to reset your password: ${token}\n\nfor_what: forget-password`,
		});

		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("medical.auth.login.OTP_SENT"),
		});
	},
);
