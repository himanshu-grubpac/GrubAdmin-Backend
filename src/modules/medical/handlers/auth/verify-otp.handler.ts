import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import type { client, vertical_medical_employee } from "@/db/types";
import {
	getSavedMedicalEmployeeOtp,
	compareOtp,
	deleteSavedMedicalEmployeeOtp,
} from "@/db/actions/medical-otp.actions.ts";

interface ResponseData {
	auth_token: string;
}

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id, otp } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email });

		if (!employee) {
			throw new APIError("No employee can be found!", "medical.auth.login.ACCOUNT_NOT_FOUND", {});
		}

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", "medical.auth.login.SUSPENDED", {});
		}

		const savedOtp = otp_id
			? await getSavedMedicalEmployeeOtp(email, otp_id)
			: await getSavedMedicalEmployeeOtp(email);

		if (!savedOtp) {
			throw new APIError("The OTP you entered is incorrect.", "medical.auth.login.OTP_INVALID");
		}

		const isOtpValid = await compareOtp(otp, savedOtp.otp);

		if (!isOtpValid) {
			throw new APIError("The OTP you entered is incorrect.", "medical.auth.login.OTP_INVALID");
		}

		await deleteSavedMedicalEmployeeOtp(email);

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_medical_employee).client_id ?? "");

		const token = JWT.signMedicalAuthToken({
			role: employee.type === "admin" ? "admin" : employee.type,
			id: employee.employee.id,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			...resolveMessageTemplate("medical.auth.login.OTP_VERIFIED"),
			client_id,
			data: {
				auth_token: token,
			},
		});
	},
);
