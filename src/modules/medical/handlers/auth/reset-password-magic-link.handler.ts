import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordMagicLinkRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { getUniqueMedicalEmployee, updateMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import { getSavedMedicalEmployeeOtp, compareOtp, deleteSavedMedicalEmployeeOtp } from "@/db/actions/medical-otp.actions.ts";

export const resetPasswordMagicLinkHandler = createHandlers(
	resetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email, token, password } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email });

		if (!employee) {
			throw new APIError("No employee can be found!", "medical.auth.login.ACCOUNT_NOT_FOUND", { is_account_found: false });
		}

		const savedOtp = await getSavedMedicalEmployeeOtp(email);

		if (!savedOtp) {
			throw new APIError("The reset link is invalid or has expired.", "medical.auth.login.OTP_EXPIRED");
		}

		const isValid = await compareOtp(token, savedOtp.otp);

		if (!isValid) {
			throw new APIError("The reset link is invalid or has expired.", "medical.auth.login.OTP_EXPIRED");
		}

		const hashedPassword = await Bcrypt.createHash({ data: password });

		await updateMedicalEmployee({
			id: employee.employee.id,
			email,
			password: hashedPassword,
			type: employee.type as any,
		});

		await deleteSavedMedicalEmployeeOtp(email);

		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("medical.auth.login.PASSWORD_RESET_SUCCESS"),
		});
	},
);
