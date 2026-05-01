import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "food-mobile/validators/auth.validators.ts";
import {
	deleteSavedFoodEmployeeOtp,
	getSavedFoodEmployeeOtp,
} from "@/db/actions/food-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message.ts";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
}

export const verifyForgetPasswordOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, phone, otp } = context.req.valid("json");


		const employee = await getUniqueVerticalFoodEmployee({
			email,
			phone,
		});

		if (!employee || !employee.employee.email) {
			throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		const employeeEmail = employee.employee.email;

		const savedOtp = await getSavedFoodEmployeeOtp(employeeEmail);

		if (!savedOtp) {
			throw new APIError(undefined, "food.auth.login.OTP_EXPIRED", undefined, 400);
		}

		const for_what = savedOtp.for_what;

		if (savedOtp.otp !== otp) {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 400);
		}

		if (savedOtp.for_what !== "forget_password") {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 401);
		}

		await deleteSavedFoodEmployeeOtp(employeeEmail);

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "food.auth.login.SUSPENDED", undefined, 403);
		}

		// Generate a temporary reset token (expires in 10 minutes)
		const token = JWT.signFoodAuthToken({
			id: employee.employee.id,
			role: employee.type,
			type: "password_reset",
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.auth.login.OTP_VERIFIED"),
			data: {
				auth_token: token,
				otp_for_what: for_what,
			},
		};

		return context.json(response as any, response.code as any);
	},
);


