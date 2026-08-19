import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import {
	consumeHospitalityEmployeeOtp,
	deleteHospitalityEmployeeOtpById,
	incrementHospitalityEmployeeOtpFailedAttempts,
} from "@/db/actions/hospitality-otp.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { getCookie } from "hono/cookie";
import { prisma } from "@/db";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/hospitality-otp-attempt.actions";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import {
	assertHospitalityClientHasEmail,
	buildHospitalityClientLookupWhere,
	normalizeAuthEmail,
} from "./auth.utils";
import { getHospitalityLoginOtpLockKey, HOSPITALITY_OTP_PER_RECORD_MAX_FAILED } from "./hospitality-otp-lockout";
import { signHospitalitySessionToken } from "./hospitality-auth-token";
import { setHospitalityAuthCookie } from "hospitality/utils/hospitality-auth-cookie";

interface ResponseData {
	otp_for_what: string;
	is_password_set: boolean;
}

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp, otp_id: otp_id_body } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);
		if (!normalizedEmail) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}
		const lockKey = getHospitalityLoginOtpLockKey(normalizedEmail);
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		if (await isOtpAttemptLocked(lockKey)) {
			const remainingMinutes = await getOtpLockoutRemaining(lockKey);
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const consumeResult = await consumeHospitalityEmployeeOtp(normalizedEmail, otp, target_otp_id);

		if (!consumeResult.consumed) {
			if (consumeResult.reason === "invalid" && consumeResult.savedOtp) {
				const attempts = await incrementHospitalityEmployeeOtpFailedAttempts(consumeResult.savedOtp.id);
				if (attempts >= HOSPITALITY_OTP_PER_RECORD_MAX_FAILED) {
					await deleteHospitalityEmployeeOtpById(consumeResult.savedOtp.id);
					await incrementOtpAttempt(lockKey);
					throw new APIError(undefined, "hospitality.auth.login.OTP_EXPIRED");
				}
			}

			await incrementOtpAttempt(lockKey);
			if (consumeResult.reason === "consumed") {
				throw new APIError(undefined, "hospitality.auth.login.OTP_EXPIRED");
			}
			throw new APIError(
				undefined,
				consumeResult.reason === "expired"
					? "hospitality.auth.login.OTP_EXPIRED"
					: "hospitality.auth.login.OTP_INVALID",
			);
		}

		const for_what = consumeResult.savedOtp.for_what;

		await resetOtpAttempt(lockKey);

		const clientRecord = await prisma.client.findFirst({
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		if (!clientRecord || !assertHospitalityClientHasEmail(clientRecord)) {
			throw new APIError(undefined, "hospitality.auth.login.EMAIL_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
		}

		if (clientRecord.status !== "active") {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_INACTIVE");
		}

		const token = await signHospitalitySessionToken(clientRecord.id, "admin");

		await loggerService.log({
			category: "Profile",
			type: "Access",
			actor: {
				id: clientRecord.id,
				name: clientRecord.name || "",
				role: "admin",
				table: "client",
			},
			client_id: clientRecord.id,
			subject: {
				id: clientRecord.id,
				name: clientRecord.name || "",
				type: "employee",
			},
			metadata: {
				action: "login",
				via: "otp",
			},
		});

		setHospitalityAuthCookie(context, token);

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				client_id: clientRecord.id,
				data: {
					otp_for_what: for_what,
					is_password_set: !!clientRecord.password,
				},
			},
			{
				status: 200,
			},
		);
	},
);
