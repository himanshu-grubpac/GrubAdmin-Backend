import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "food-mobile/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { JWT } from "@/utils/jwt.ts";
import {
	deleteSavedFoodEmployeeOtp,
	getSavedFoodEmployeeOtp,
} from "@/db/actions/food-employee-otp.actions.ts";
import { resolveMessageTemplate } from "@/utils/message.ts";

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
				throw new APIError(undefined, "food.auth.login.AUTH_TOKEN_REQUIRED", undefined, 401);
			}

			const decoded = JWT.verifyFoodAuthToken(token);
			userId = decoded.id;
		} else if (bodyToken) {
			// Try to verify bodyToken as a JWT first
			try {
				const decoded = JWT.verifyFoodAuthToken(bodyToken);

				if (decoded.type !== "password_reset") {
					throw new APIError(undefined, "food.auth.login.INVALID_AUTH_TOKEN", undefined, 401);
				}

				userId = decoded.id;

				// If email or phone is provided, verify it matches the token
				if (email || phone) {
					const employeeByToken = await getUniqueVerticalFoodEmployee({
						id: decoded.id,
					});

					if (
						(email && employeeByToken?.employee.email !== email) ||
						(phone && employeeByToken?.employee.mobile_number !== phone)
					) {
						throw new APIError(undefined, "food.auth.login.CREDENTIAL_MISMATCH", undefined, 401);
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

				const employeeForOtp = await getUniqueVerticalFoodEmployee({
					email,
					phone,
				});

				if (!employeeForOtp || !employeeForOtp.employee.email) {
					throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
				}

				const savedOtp = await getSavedFoodEmployeeOtp(employeeForOtp.employee.email);

				if (!savedOtp || savedOtp.otp !== bodyToken) {
					throw new APIError(undefined, "food.auth.login.INVALID_OTP_TOKEN", undefined, 401);
				}

				if (savedOtp.for_what !== "forget_password" && savedOtp.for_what !== "login") {
					throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 401);
				}

				userId = employeeForOtp.employee.id;
			}
		} else {
			throw new APIError("Authentication token or email/token pair is required!", undefined, undefined, 401);
		}

		if (!userId) {
			throw new APIError(undefined, "food.auth.login.AUTH_FAILED", undefined, 401);
		}

		const employee = await getUniqueVerticalFoodEmployee({
			id: userId,
		});

		if (!employee?.employee) {
			throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (employee.employee.status === "suspended") {
			throw new APIError(undefined, "food.auth.login.SUSPENDED", undefined, 403);
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
			await prisma.vertical_food_employee.update({
				where: {
					id: employee.employee.id,
				},
				data: {
					password: hashedPassword,
				},
			});
		}

		const employeeEmail = employee.employee.email;
		if (employeeEmail) {
			await deleteSavedFoodEmployeeOtp(employeeEmail);
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("food.auth.PASSWORD_SET_SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);


