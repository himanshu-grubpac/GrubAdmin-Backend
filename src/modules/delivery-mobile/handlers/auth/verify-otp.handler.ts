import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "delivery-mobile/validators/auth.validators.ts";
import {
	deleteSavedDeliveryEmployeeOtp,
	getSavedDeliveryEmployeeOtp,
	compareOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { APIError } from "@/types/error";
import {
	activateVerticalDeliveryEmployee,
	getUniqueVerticalDeliveryEmployee,
} from "@/db/actions/vertical-delivery-employee.actions";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import type { client, vertical_delivery_employee } from "@/db/types";
import { resolveMessageTemplate } from "@/utils/message.ts";
import {
	signDeliverySessionRefreshToken,
	signDeliverySessionToken,
} from "delivery/handlers/auth/delivery-auth-token";

interface ResponseData {
	auth_token: string;
	refresh_token?: string;
	otp_for_what: string;
	is_password_set: boolean;
}

export const verifyOtpHandler = createHandlers(
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

		if (savedOtp.for_what !== "login") {
			throw new APIError(undefined, "delivery.auth.login.OTP_INVALID", undefined, 401);
		}

		await deleteSavedDeliveryEmployeeOtp(employeeEmail);

		if (!employee?.employee) {
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (
			employee.employee.status === "suspended"
		) {
			throw new APIError(undefined, "delivery.auth.login.SUSPENDED", undefined, 403);
		}

		if (employee.employee.status === "unassigned") {
			await activateVerticalDeliveryEmployee({
				id: employee.employee.id,
				email: employeeEmail,
				type: employee.type,
			});
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");

		const payload = {
			id: employee.employee.id,
			role: employee.type,
			type: "password_reset",
		};
		const token = await signDeliverySessionToken(client_id, payload);
		const refreshToken = await signDeliverySessionRefreshToken(client_id, payload);

		const response = {
			success: true as const,
			client_id,
			...resolveMessageTemplate("delivery.auth.login.SUCCESS"),
			data: {
				auth_token: token,
				refresh_token: refreshToken,
				otp_for_what: for_what,
				is_password_set: !!employee.employee.password,
			},
		};

		return context.json(response as any, response.code as any);
	},
);


