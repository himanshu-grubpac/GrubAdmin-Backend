import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "delivery-mobile/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { JWT } from "@/utils/jwt.ts";
import {
	deleteSavedDeliveryEmployeeOtp,
	getSavedDeliveryEmployeeOtp,
	compareOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { resolveMessageTemplate } from "@/utils/message.ts";
import type { vertical_delivery_employee } from "@/db/types";
import { invalidateDeliveryAuthSessions } from "delivery/handlers/auth/delivery-auth-token";

export const setNewPasswordHandler = createHandlers(
	setNewPasswordRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");
		const { password, email, phone } = body;
		const bodyToken = body.auth_token || body["auth-token"] || body.token;

		const authHeader = context.req.header("Authorization");
		let userId: string | undefined;

		if (authHeader && authHeader.startsWith("Bearer ")) {
			const token = authHeader.split(" ")[1];
			if (!token) {
				throw new APIError(undefined, "delivery.auth.login.AUTH_TOKEN_REQUIRED", undefined, 401);
			}

			const decoded = JWT.verifyDeliveryAuthToken(token);
			userId = decoded.id;
		} else if (bodyToken) {
			// Try to verify bodyToken as a JWT first
			try {
				const decoded = JWT.verifyDeliveryAuthToken(bodyToken);

				if (decoded.type !== "password_reset") {
					throw new APIError(undefined, "delivery.auth.login.INVALID_AUTH_TOKEN", undefined, 401);
				}

				userId = decoded.id;

				// If email or phone is provided, verify it matches the token
				if (email || phone) {
					const employeeByToken = await getUniqueVerticalDeliveryEmployee({
						id: decoded.id,
					});

					if (
						(email && employeeByToken?.employee.email !== email) ||
						(phone && employeeByToken?.employee.mobile_number !== phone)
					) {
						throw new APIError(undefined, "delivery.auth.login.CREDENTIAL_MISMATCH", undefined, 401);
					}
				}
			} catch (error) {
				// If error is an APIError (like "token mismatch" or "invalid type"), re-throw it
				if (error instanceof APIError) {
					throw error;
				}

				// If JWT verification fails, check if it's an OTP
				if (!email && !phone) {
					throw new APIError("Email or phone is required for OTP-based reset!", undefined, undefined, 400);
				}

				const employeeForOtp = await getUniqueVerticalDeliveryEmployee({
					email,
					phone,
				});

				if (!employeeForOtp || !employeeForOtp.employee.email) {
					throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
				}

				const savedOtp = await getSavedDeliveryEmployeeOtp(employeeForOtp.employee.email);

				const isOtpValid = savedOtp ? await compareOtp(bodyToken, savedOtp.otp) : false;
				if (!savedOtp || !isOtpValid) {
					throw new APIError(undefined, "delivery.auth.login.INVALID_OTP_TOKEN", undefined, 401);
				}

				if (savedOtp.for_what !== "forget_password" && savedOtp.for_what !== "login") {
					throw new APIError(undefined, "delivery.auth.login.OTP_INVALID", undefined, 401);
				}

				userId = employeeForOtp.employee.id;
			}
		} else {
			throw new APIError("Authentication token or email/token pair is required!", undefined, undefined, 401);
		}

		if (!userId) {
			throw new APIError(undefined, "delivery.auth.login.AUTH_FAILED", undefined, 401);
		}

		const employee = await getUniqueVerticalDeliveryEmployee({
			id: userId,
		});

		if (!employee?.employee) {
			throw new APIError(undefined, "delivery.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "delivery.auth.login.SUSPENDED", undefined, 403);
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		if (employee.type === "admin") {
			await prisma.client.update({
				where: {
					id: employee.employee.id,
				},
				data: {
					password: hashedPassword,
				},
			});
		} else {
			await prisma.vertical_delivery_employee.update({
				where: {
					id: employee.employee.id,
				},
				data: {
					password: hashedPassword,
				},
			});
		}

		const client_id =
			employee.type === "admin"
				? employee.employee.id
				: ((employee.employee as vertical_delivery_employee).client_id ?? "");
		if (client_id) {
			await invalidateDeliveryAuthSessions(client_id);
		}

		const employeeEmail = employee.employee.email;
		if (employeeEmail) {
			await deleteSavedDeliveryEmployeeOtp(employeeEmail);
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.auth.PASSWORD_SET_SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);


