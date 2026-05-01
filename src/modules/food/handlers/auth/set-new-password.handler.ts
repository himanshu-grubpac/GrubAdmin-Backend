import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "food/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";
import { JWT } from "@/utils/jwt.ts";
import {
    deleteSavedOtp,
    getSavedOtp,
} from "@/db/actions/otp.actions.ts";
import { getCookie } from "hono/cookie";

export const setNewPasswordHandler = createHandlers(
    setNewPasswordRequestBodyValidator,
    async (context) => {
        const body = context.req.valid("json");
        const { password, email } = body;
        const bodyToken = body.auth_token;

        const authHeader = context.req.header("Authorization");
        let userId: string | undefined;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (!token) {
                throw new APIError(undefined, "food.auth.login.AUTH_TOKEN_REQUIRED");
            }

            const decoded = JWT.verifyFoodAuthToken(token);
            userId = decoded.id;
        } else if (bodyToken) {
            const otp_id_body = body.otp_id;
            const otp_id_cookie = getCookie(context, "otp_id");
            const target_otp_id = otp_id_body || otp_id_cookie;

            // Try to verify bodyToken as a JWT first
            try {
                const decoded = JWT.verifyFoodAuthToken(bodyToken);

                if (decoded.type !== "password_reset") {
                    throw new APIError(undefined, "food.auth.login.INVALID_AUTH_TOKEN");
                }

                userId = decoded.id;

                // If email is provided, verify it matches the token
                if (email) {
                    const employeeByToken = await getUniqueVerticalFoodEmployee({
                        id: decoded.id,
                    });

                    if (email && employeeByToken?.employee.email !== email) {
                        throw new APIError(undefined, "food.auth.login.CREDENTIAL_MISMATCH");
                    }
                }
            } catch (error) {
                // If error is an APIError (like "token mismatch" or "invalid type"), re-throw it
                if (error instanceof APIError) {
                    throw error;
                }

                // If JWT verification fails, check if it's an OTP (magic link token)
                const employeeForOtp = await getUniqueVerticalFoodEmployee({
                    email,
                });

                if (!employeeForOtp || !employeeForOtp.employee.email) {
                    throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND");
                }

                const savedOtp = await getSavedOtp(employeeForOtp.employee.email, target_otp_id);

                if (!savedOtp || savedOtp.otp !== bodyToken) {
                    throw new APIError(undefined, "food.auth.login.INVALID_OTP_TOKEN");
                }

                if (savedOtp.for_what !== "forget_password") {
                    throw new APIError(undefined, "food.auth.login.OTP_INVALID");
                }

                userId = employeeForOtp.employee.id;
            }
        } else {
            throw new APIError(undefined, "food.auth.login.AUTH_TOKEN_REQUIRED");
        }

        if (!userId) {
            throw new APIError(undefined, "food.auth.login.AUTH_FAILED");
        }

        const employee = await getUniqueVerticalFoodEmployee({
            id: userId,
        });

        if (!employee?.employee) {
            throw new APIError(undefined, "food.auth.login.ACCOUNT_NOT_FOUND");
        }

        if (employee.employee.status === "suspended") {
            throw new APIError(undefined, "food.auth.login.SUSPENDED");
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
            await deleteSavedOtp(employeeEmail);
        }

        const response = {
            success: true as const,
            ...resolveMessageTemplate("food.auth.PASSWORD_SET_SUCCESS"),
        };

		return context.json(response as any, response.code as any);
    },
);

