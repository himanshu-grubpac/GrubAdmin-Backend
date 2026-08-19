import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "delivery-mobile/validators/auth.validators.ts";
import {
	deleteSavedDeliveryEmployeeOtp,
	getSavedDeliveryEmployeeOtp,
	compareOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message.ts";
import type { client, vertical_delivery_employee } from "@/db/types";
import { signDeliverySessionToken } from "delivery/handlers/auth/delivery-auth-token";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
}

export const verifyForgetPasswordOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, phone, otp } = context.req.valid("json");


		const employee = await getUniqueVerticalDeliveryEmployee({
			email,
			phone,
		});

		if (!employee || !employee.employee.email) {
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		const employeeEmail = employee.employee.email;

		const savedOtp = await getSavedDeliveryEmployeeOtp(employeeEmail);

		if (!savedOtp) {
			throw new APIError(undefined, "delivery.auth.login.OTP_EXPIRED", undefined, 400);
		}

		const for_what = savedOtp.for_what;

		const isOtpValid = await compareOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError(undefined, "delivery.auth.login.OTP_INVALID", undefined, 400);
		}

		if (savedOtp.for_what !== "forget_password") {
			throw new APIError(undefined, "delivery.auth.login.OTP_INVALID", undefined, 401);
		}

		await deleteSavedDeliveryEmployeeOtp(employeeEmail);

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "delivery.auth.login.SUSPENDED", undefined, 403);
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");

		// Generate a temporary reset token (expires in 10 minutes)
		const token = await signDeliverySessionToken(client_id, {
			id: employee.employee.id,
			role: employee.type,
			type: "password_reset",
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.auth.login.OTP_VERIFIED"),
			data: {
				auth_token: token,
				otp_for_what: for_what,
			},
		};

		return context.json(response as any, response.code as any);
	},
);


