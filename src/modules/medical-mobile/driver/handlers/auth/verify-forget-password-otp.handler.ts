import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/auth.validators.ts";
import {
	deleteSavedMedicalEmployeeOtp,
	getSavedMedicalEmployeeOtp,
	compareOtp,
} from "@/db/actions/medical-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { assertHandlerEmployee } from "./auth.utils.ts";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
}

export const verifyForgetPasswordOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, phone, otp } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email, phone });
		assertHandlerEmployee(employee);

		const employeeEmail = employee.employee.email;
		const savedOtp = await getSavedMedicalEmployeeOtp(employeeEmail);

		if (!savedOtp) {
			throw new APIError("OTP expired or invalid", undefined, undefined, 400);
		}

		const for_what = savedOtp.for_what;
		const isOtpValid = await compareOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError("Invalid otp", undefined, undefined, 400);
		}

		if (savedOtp.for_what !== "forget_password") {
			throw new APIError("Invalid otp purpose", undefined, undefined, 401);
		}

		await deleteSavedMedicalEmployeeOtp(employeeEmail);

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", undefined, undefined, 403);
		}

		const token = JWT.signMedicalMobileAuthToken({
			id: employee.employee.id,
			role: "handler",
			persona: "driver",
			type: "password_reset",
		} as any);

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			message: "OTP verified successfully",
			data: {
				auth_token: token,
				otp_for_what: for_what,
			},
		});
	},
);
