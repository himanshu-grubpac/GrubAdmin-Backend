import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { getUniqueMedicalEmployee, updateMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import {
	getSavedMedicalEmployeeOtp,
	compareOtp,
	deleteSavedMedicalEmployeeOtp,
} from "@/db/actions/medical-otp.actions.ts";

export const setNewPasswordHandler = createHandlers(
	setNewPasswordRequestBodyValidator,
	async (context) => {
		const { email, auth_token, otp_id, password } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email });

		if (!employee) {
			throw new APIError("No employee can be found!", "medical.auth.login.ACCOUNT_NOT_FOUND", {});
		}

		if (auth_token) {
			try {
				JWT.verifyMedicalAuthToken(auth_token);
			} catch {
				throw new APIError("The auth token is invalid for this request!", "medical.auth.login.INVALID_AUTH_TOKEN");
			}
		} else if (otp_id) {
			const savedOtp = await getSavedMedicalEmployeeOtp(email, otp_id);

			if (!savedOtp) {
				throw new APIError("The OTP you entered is incorrect.", "medical.auth.login.OTP_INVALID");
			}

			const isOtpValid = await compareOtp(otp_id, savedOtp.otp);

			if (!isOtpValid) {
				throw new APIError("The OTP you entered is incorrect.", "medical.auth.login.OTP_INVALID");
			}

			await deleteSavedMedicalEmployeeOtp(email);
		} else if (!auth_token && !otp_id) {
			throw new APIError("Authentication token is required!", "medical.auth.login.AUTH_TOKEN_REQUIRED");
		}

		const hashedPassword = await Bcrypt.generateHash({ data: password });

		await updateMedicalEmployee({
			id: employee.employee.id,
			email,
			password: hashedPassword,
			type: employee.type as any,
		});

		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("medical.auth.login.PASSWORD_SET_SUCCESS"),
		});
	},
);
