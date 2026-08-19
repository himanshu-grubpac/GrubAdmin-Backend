import { createHandlers } from "@/utils/hono-factory.ts";
import { sendOtpRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import {
	deleteHospitalityEmployeeOtpById,
	getSavedHospitalityEmployeeOtp,
	saveHospitalityEmployeeOtp,
} from "@/db/actions/hospitality-otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "@/db";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import {
	assertHospitalityClientHasEmail,
	buildHospitalityClientLookupWhere,
	getHospitalityMailFrom,
	getHospitalityOtpCookieOptions,
	isHospitalityOtpDevLogEnabled,
	logHospitalityOtpDev,
	maskAuthEmail,
	normalizeAuthEmail,
} from "./auth.utils";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { queueHospitalityMail } from "hospitality/utils/hospitality-mail-queue";

export const sendOtpHandler = createHandlers(
	sendOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id: otp_id_body } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const clientRecord = await prisma.client.findFirst({
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		if (!clientRecord || !assertHospitalityClientHasEmail(clientRecord)) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
		}

		if (clientRecord.status !== "active") {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_INACTIVE");
		}

		const clientEmail = normalizeAuthEmail(clientRecord.email);

		let savedOtp = null;
		if (target_otp_id) {
			savedOtp = await getSavedHospitalityEmployeeOtp(clientEmail, target_otp_id);
		} else {
			savedOtp = await getSavedHospitalityEmployeeOtp(clientEmail);
		}

		if (savedOtp) {
			const timeDiff = Date.now() - new Date(savedOtp.createdAt).getTime();
			const cooldown = 60000;
			if (timeDiff < cooldown) {
				throw new APIError(undefined, "hospitality.auth.login.OTP_COOLDOWN", undefined, 429);
			}
		}

		const otp = Otp.generateOtp(4);

		let updatedOtpRecord;
		try {
			updatedOtpRecord = await saveHospitalityEmployeeOtp({
				otp_id: savedOtp?.otp_id,
				email: clientEmail,
				otp,
				role: "admin",
				for_what: "login",
			});
		} catch (error) {
			logHospitality(context, "error", "hospitality_send_otp_save_failed", {
				client_id: clientRecord.id,
				error: String(error),
			});
			throw new APIError(undefined, "hospitality.auth.login.OTP_SAVE_FAILED");
		}

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "hospitality.auth.login.OTP_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;

		setCookie(context, "otp_id", otp_id, getHospitalityOtpCookieOptions());

		queueHospitalityMail({
			label: "send-otp",
			send: () =>
				services.mailer.sendEmail({
					from: getHospitalityMailFrom(),
					subject: "Hospitality Portal - Login OTP",
					to: clientEmail,
					text: `Your OTP to log into your hospitality platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: login-send`,
				}),
			onFailure: async () => {
				logHospitality(context, "error", "hospitality_send_otp_mail_failed", {
					client_id: clientRecord.id,
					otp_id,
				});
				if (isHospitalityOtpDevLogEnabled()) {
					logHospitalityOtpDev({
						email: clientEmail,
						otp,
						otp_id,
						for_what: "login-send-mail-failed-dev-keep",
					});
				} else {
					await deleteHospitalityEmployeeOtpById(updatedOtpRecord.id);
				}
			},
		});

		logHospitalityOtpDev({
			email: clientEmail,
			otp,
			otp_id,
			for_what: "login-send",
		});

		return context.json<APIResponse<{ otp_id: string; otp_details: { type: string; values: string[] } }>>({
			success: true,
			code: 200,
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
