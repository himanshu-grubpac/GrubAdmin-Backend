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
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import {
	buildHospitalityClientLookupWhere,
	normalizeAuthEmail,
} from "./auth.utils";
import { signHospitalitySessionToken } from "./hospitality-auth-token";
import type { HospitalityAuthPayload } from "@/types/jwt/hospitality-auth-payload";
import {
	extractHospitalityAuthToken,
	setHospitalityAuthCookie,
} from "hospitality/utils/hospitality-auth-cookie";

const isJwtShape = (value: string) => value.split(".").length === 3;

interface SetPasswordResponseData {
	is_password_set: true;
}

export const setNewPasswordHandler = createHandlers(
	setNewPasswordRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");
		const { password, email } = body;
		const normalizedEmail = email ? normalizeAuthEmail(email) : undefined;
		const normalizedPassword = password.trim();
		const bodyToken = body.auth_token;

		let userId: string | undefined;
		let bearerPayload: HospitalityAuthPayload | undefined;

		if (bodyToken) {
			const otp_id_body = body.otp_id;
			const otp_id_cookie = getCookie(context, "otp_id");
			const target_otp_id = otp_id_body || otp_id_cookie;

			if (isJwtShape(bodyToken)) {
				const decoded = JWT.verifyHospitalityAuthToken(bodyToken);

				if (decoded.type !== "password_reset") {
					throw new APIError(undefined, "hospitality.auth.login.INVALID_AUTH_TOKEN");
				}

				userId = decoded.id;

				if (normalizedEmail) {
					const clientByToken = await prisma.client.findUnique({
						where: { id: decoded.id },
						include: { vertical: true },
					});
					if (clientByToken?.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
						throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
					}
					const tokenEmail = clientByToken?.email
						? normalizeAuthEmail(clientByToken.email)
						: undefined;

					if (tokenEmail !== normalizedEmail) {
						throw new APIError(undefined, "hospitality.auth.login.CREDENTIAL_MISMATCH");
					}
				}
			} else {
				if (!normalizedEmail) {
					throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
				}

				const clientForOtp = await prisma.client.findFirst({
					where: buildHospitalityClientLookupWhere(normalizedEmail),
					include: { vertical: true },
				});

				if (!clientForOtp?.email) {
					throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
				}

				const savedOtp = await getSavedOtp(clientForOtp.email, target_otp_id);
				const { compareOtp } = await import("@/db/actions/otp.actions.ts");

				if (!savedOtp || !(await compareOtp(bodyToken, savedOtp.otp))) {
					throw new APIError(undefined, "hospitality.auth.login.INVALID_OTP_TOKEN");
				}

				if (savedOtp.for_what !== "forget_password") {
					throw new APIError(undefined, "hospitality.auth.login.OTP_INVALID");
				}

				userId = clientForOtp.id;
			}
		} else {
			const sessionToken = extractHospitalityAuthToken(context);
			if (!sessionToken) {
				throw new APIError(undefined, "hospitality.auth.login.AUTH_TOKEN_REQUIRED");
			}

			const decoded = JWT.verifyHospitalityAuthToken(sessionToken);
			// Welcome / session path must not accept password-reset JWTs.
			if (decoded.type === "password_reset") {
				throw new APIError(undefined, "hospitality.auth.login.INVALID_AUTH_TOKEN");
			}
			bearerPayload = decoded;
			userId = decoded.id;
		}

		if (!userId) {
			throw new APIError(undefined, "hospitality.auth.login.AUTH_FAILED");
		}

		const clientRecord = await prisma.client.findUnique({
			where: { id: userId },
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
		}

		const recordEmail = clientRecord.email
			? normalizeAuthEmail(clientRecord.email)
			: undefined;
		if (normalizedEmail && recordEmail !== normalizedEmail) {
			throw new APIError(undefined, "hospitality.auth.login.CREDENTIAL_MISMATCH");
		}

		if (clientRecord.status !== "active") {
			throw new APIError(
				undefined,
				clientRecord.status === "suspended"
					? "hospitality.auth.login.SUSPENDED"
					: "hospitality.auth.login.ACCOUNT_INACTIVE",
			);
		}

		const currentVersion = clientRecord.auth_token_version ?? 0;

		// Bearer Welcome path: reject revoked/stale session JWTs before mutating password.
		if (bearerPayload) {
			const tokenVersion = bearerPayload.token_version ?? 0;
			if (tokenVersion !== currentVersion) {
				throw new APIError(
					"The auth token is either invalid or has expired!",
					undefined,
					undefined,
					401,
				);
			}
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: normalizedPassword,
			saltLength: 10,
		});

		// Optimistic concurrency: second concurrent set-password loses (count=0).
		const expectedVersion = bearerPayload
			? (bearerPayload.token_version ?? 0)
			: currentVersion;

		const updated = await prisma.client.updateMany({
			where: {
				id: clientRecord.id,
				auth_token_version: expectedVersion,
				status: "active",
			},
			data: {
				password: hashedPassword,
				auth_token_version: { increment: 1 },
			},
		});

		if (updated.count === 0) {
			throw new APIError(
				"The auth token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		const clientEmail = clientRecord.email;
		if (clientEmail) {
			await deleteSavedOtp(clientEmail);
		}

		const sessionToken = await signHospitalitySessionToken(clientRecord.id, "admin");
		if (!sessionToken) {
			throw new APIError(undefined, "hospitality.auth.login.AUTH_FAILED");
		}

		setHospitalityAuthCookie(context, sessionToken);

		return context.json<APIResponse<SetPasswordResponseData>>({
			success: true,
			...resolveMessageTemplate("hospitality.auth.PASSWORD_SET_SUCCESS"),
			data: {
				is_password_set: true,
			},
		} as APIResponse<SetPasswordResponseData>);
	},
);
