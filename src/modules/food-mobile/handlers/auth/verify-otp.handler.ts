import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "food-mobile/validators/auth.validators.ts";
import {
	deleteSavedFoodEmployeeOtp,
	getSavedFoodEmployeeOtp,
} from "@/db/actions/food-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import {
	activateVerticalFoodEmployee,
	getUniqueVerticalFoodEmployee,
} from "@/db/actions/vertical-food-employee.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import type { client, vertical_food_employee } from "@/db/types";
import { resolveMessageTemplate } from "@/utils/message.ts";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
	is_password_set: boolean;
}

export const verifyOtpHandler = createHandlers(
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

		console.log(savedOtp);

		const for_what = savedOtp.for_what;

		if (savedOtp.otp !== otp) {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 400);
		}

		if (savedOtp.for_what !== "login") {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 401);
		}

		await deleteSavedFoodEmployeeOtp(employeeEmail);

		console.log(employee);

		if (!employee?.employee) {
			throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (
			employee.employee.status === "suspended"
		) {
			throw new APIError(undefined, "food.auth.login.SUSPENDED", undefined, 403);
		}

		if (employee.employee.status === "unassigned") {
			await activateVerticalFoodEmployee({
				email: employeeEmail,
				type: employee.type,
			});
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_food_employee).client_id ?? "");

		const token = JWT.signFoodAuthToken({
			id: employee.employee.id,
			role: employee.type,
			type: "password_reset",
		});

		const response = {
			success: true as const,
			client_id,
			...resolveMessageTemplate("food.auth.login.SUCCESS"),
			data: {
				auth_token: token,
				otp_for_what: for_what,
				is_password_set: !!employee.employee.password,
			},
		};

		return context.json(response as any, response.code as any);
	},
);


