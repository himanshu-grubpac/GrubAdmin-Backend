import { createHandlers } from "@/utils/hono-factory.ts";
import { resendOtpRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import {
	deleteHospitalityEmployeeOtpById,
	getSavedHospitalityEmployeeOtp,
	saveHospitalityEmployeeOtp,
} from "@/db/actions/hospitality-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import type { APIResponse } from "@/types/api";
import { services } from "@/services";
import { getCookie, setCookie } from "hono/cookie";
import { resolveMessageTemplate } from "@/utils/message.ts";
import { prisma } from "@/db";
import {
	isOtpAttemptLocked,
	getOtpLockoutRemaining,
} from "@/db/actions/hospitality-otp-attempt.actions";
import {
	buildHospitalityClientLookupWhere,
	getHospitalityFrontendUrl,
	getHospitalityMailFrom,
	getHospitalityOtpCookieOptions,
	isHospitalityOtpDevLogEnabled,
	logHospitalityOtpDev,
	maskAuthEmail,
	normalizeAuthEmail,
} from "./auth.utils";
import { getHospitalityLoginOtpLockKey } from "./hospitality-otp-lockout";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { queueHospitalityMail } from "hospitality/utils/hospitality-mail-queue";

export const resendOtpHandler = createHandlers(
	resendOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id: otp_id_body } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);
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

		const clientRecord = await prisma.client.findFirst({
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED", undefined, 403);
		}

		if (clientRecord.status !== "active") {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_INACTIVE", undefined, 403);
		}

		const clientEmail = clientRecord.email;
		if (!clientEmail) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		const normalizedClientEmail = normalizeAuthEmail(clientEmail);

		let sentOtp = await getSavedHospitalityEmployeeOtp(normalizedClientEmail, target_otp_id);
		let isForgotPassword = false;

		if (!sentOtp) {
			const { getSavedOtp } = await import("@/db/actions/otp.actions.ts");
			sentOtp = (await getSavedOtp(normalizedClientEmail, target_otp_id)) as any;
			isForgotPassword = true;
		}

		if (!sentOtp) {
			throw new APIError(undefined, "hospitality.auth.login.OTP_EXPIRED", undefined, 400);
		}

		const timeDiff = Date.now() - new Date((sentOtp as any).createdAt).getTime();
		const cooldown = 60000;
		if (timeDiff < cooldown) {
			throw new APIError(undefined, "hospitality.auth.login.OTP_COOLDOWN", undefined, 429);
		}

		let otp_id: string;

		if (isForgotPassword) {
			const crypto = await import("crypto");
			const token = crypto.randomBytes(32).toString("hex");
			const { saveOtp, deleteSavedOtp } = await import("@/db/actions/otp.actions.ts");
			const updatedOtpRecord = await saveOtp({
				otp_id: sentOtp.otp_id,
				email: normalizedClientEmail,
				otp: token,
				role: "admin",
				for_what: "forget_password",
			});
			if (!updatedOtpRecord) {
				throw new APIError(undefined, "hospitality.auth.login.OTP_SAVE_FAILED");
			}
			otp_id = updatedOtpRecord.otp_id;

			const resetUrl = `${getHospitalityFrontendUrl()}/auth/reset-password?link_id=${otp_id}`;
			queueHospitalityMail({
				label: "forget-resend",
				send: () =>
					services.mailer.sendEmail({
						from: getHospitalityMailFrom(),
						subject: "Hospitality Portal - Reset Password Link",
						to: normalizedClientEmail,
						text: `Click the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nfor_what: forget-resend`,
					}),
				onFailure: async () => {
					logHospitality(context, "error", "hospitality_resend_otp_magic_link_mail_failed", {
						client_id: clientRecord.id,
						otp_id,
					});
					if (isHospitalityOtpDevLogEnabled()) {
						logHospitalityOtpDev({
							email: normalizedClientEmail,
							otp: token,
							otp_id,
							for_what: "forget-resend-mail-failed-dev-keep",
						});
					} else {
						await deleteSavedOtp(normalizedClientEmail);
					}
				},
			});
		} else {
			const otp = Otp.generateOtp(4);
			const updatedOtpRecord = await saveHospitalityEmployeeOtp({
				otp_id: sentOtp.otp_id,
				email: normalizedClientEmail,
				otp,
				role: "admin",
				for_what: sentOtp.for_what,
			});
			if (!updatedOtpRecord) {
				throw new APIError(undefined, "hospitality.auth.login.OTP_SAVE_FAILED");
			}
			otp_id = updatedOtpRecord.otp_id;

			const for_what = `${sentOtp.for_what === "forget_password" ? "forget" : sentOtp.for_what}-resend`;
			queueHospitalityMail({
				label: "login-resend-otp",
				send: () =>
					services.mailer.sendEmail({
						from: getHospitalityMailFrom(),
						subject: "Hospitality Portal - Login OTP",
						to: normalizedClientEmail,
						text: `Your OTP to log into your hospitality platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: ${for_what}`,
					}),
				onFailure: async () => {
					logHospitality(context, "error", "hospitality_resend_otp_mail_failed", {
						client_id: clientRecord.id,
						otp_id,
					});
					if (isHospitalityOtpDevLogEnabled()) {
						logHospitalityOtpDev({
							email: normalizedClientEmail,
							otp,
							otp_id,
							for_what: `${for_what}-mail-failed-dev-keep`,
						});
					} else {
						await deleteHospitalityEmployeeOtpById(updatedOtpRecord.id);
					}
				},
			});

			logHospitalityOtpDev({
				email: normalizedClientEmail,
				otp,
				otp_id,
				for_what,
			});
		}

		setCookie(context, "otp_id", otp_id, getHospitalityOtpCookieOptions());

		return context.json({
			success: true,
			...resolveMessageTemplate("hospitality.auth.login.OTP_SENT"),
			data: {
				otp_id,
				otp_details: {
					type: "email",
					values: [maskAuthEmail(clientEmail)],
				},
			},
		});
	},
);
