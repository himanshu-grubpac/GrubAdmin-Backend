import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
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
				throw new APIError(undefined, "hospitality.auth.login.AUTH_TOKEN_REQUIRED");
			}

			const decoded = JWT.verifyDeliveryAuthToken(token);
			userId = decoded.id;
		} else if (bodyToken) {
			const otp_id_body = body.otp_id;
			const otp_id_cookie = getCookie(context, "otp_id");
			const target_otp_id = otp_id_body || otp_id_cookie;

			try {
				const decoded = JWT.verifyDeliveryAuthToken(bodyToken);

				if (decoded.type !== "password_reset") {
					throw new APIError(undefined, "hospitality.auth.login.INVALID_AUTH_TOKEN");
				}

				userId = decoded.id;

				if (email) {
					const clientByToken = await prisma.client.findUnique({
						where: { id: decoded.id },
					});

					if (email && clientByToken?.email !== email) {
						throw new APIError(undefined, "hospitality.auth.login.CREDENTIAL_MISMATCH");
					}
				}
			} catch (error) {
				if (error instanceof APIError) {
					throw error;
				}

				const clientRecord = await prisma.client.findFirst({
					where: { email },
				});

				if (!clientRecord || !clientRecord.email) {
					throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
				}

				const savedOtp = await getSavedOtp(clientRecord.email, target_otp_id);

				const { compareOtp } = await import("@/db/actions/otp.actions.ts");
				if (!savedOtp || !(await compareOtp(bodyToken, savedOtp.otp))) {
					throw new APIError(undefined, "hospitality.auth.login.INVALID_OTP_TOKEN");
				}

				if (savedOtp.for_what !== "forget_password") {
					throw new APIError(undefined, "hospitality.auth.login.OTP_INVALID");
				}

				userId = clientRecord.id;
			}
		} else {
			throw new APIError(undefined, "hospitality.auth.login.AUTH_TOKEN_REQUIRED");
		}

		if (!userId) {
			throw new APIError(undefined, "hospitality.auth.login.AUTH_FAILED");
		}

		const clientRecord = await prisma.client.findUnique({
			where: { id: userId },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "hospitality.auth.login.SUSPENDED");
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		await prisma.client.update({
			where: {
				id: clientRecord.id,
			},
			data: {
				password: hashedPassword,
			},
		});

		const clientEmail = clientRecord.email;
		if (clientEmail) {
			await deleteSavedOtp(clientEmail);
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.auth.PASSWORD_SET_SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);
