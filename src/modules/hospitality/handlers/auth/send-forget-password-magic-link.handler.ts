import { createHandlers } from "@/utils/hono-factory.ts";
import { sendForgetPasswordMagicLinkRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { deleteSavedOtp, saveOtp } from "@/db/actions/otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import crypto from "crypto";
import { prisma } from "@/db";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import {
	buildHospitalityClientLookupWhere,
	getHospitalityFrontendUrl,
	getHospitalityMailFrom,
	isHospitalityOtpDevLogEnabled,
	logHospitalityOtpDev,
	maskAuthEmail,
	normalizeAuthEmail,
} from "./auth.utils";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { queueHospitalityMail } from "hospitality/utils/hospitality-mail-queue";

export const sendForgetPasswordMagicLinkHandler = createHandlers(
	sendForgetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);

		const clientRecord = await prisma.client.findFirst({
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "hospitality.auth.login.SUSPENDED");
		}

		if (clientRecord.status !== "active") {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_INACTIVE");
		}

		const clientEmail = clientRecord.email;
		if (!clientEmail) {
			throw new APIError(undefined, "hospitality.auth.login.EMAIL_NOT_FOUND");
		}

		const normalizedClientEmail = normalizeAuthEmail(clientEmail);
		const token = crypto.randomBytes(32).toString("hex");

		let updatedOtpRecord;
		try {
			updatedOtpRecord = await saveOtp({
				otp_id: undefined,
				email: normalizedClientEmail,
				otp: token,
				role: "admin",
				for_what: "forget_password",
			});
		} catch (error) {
			logHospitality(context, "error", "hospitality_forget_password_save_failed", {
				client_id: clientRecord.id,
				error: String(error),
			});
			throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_SAVE_FAILED");
		}

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;
		// Opaque link — email URL exposes link_id (otp_id) only; FE calls verify to obtain token+email.
		const resetUrl = `${getHospitalityFrontendUrl()}/auth/reset-password?link_id=${otp_id}`;

		queueHospitalityMail({
			label: "forget-password-send",
			send: () =>
				services.mailer.sendEmail({
					from: getHospitalityMailFrom(),
					subject: "Hospitality Portal - Reset Password Link",
					to: normalizedClientEmail,
					text: `Click the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nfor_what: forget-send`,
				}),
			onFailure: async () => {
				logHospitality(context, "error", "hospitality_forget_password_mail_failed", {
					client_id: clientRecord.id,
					otp_id,
				});
				if (isHospitalityOtpDevLogEnabled()) {
					logHospitalityOtpDev({
						email: normalizedClientEmail,
						otp: token,
						otp_id,
						for_what: "forget-send-mail-failed-dev-keep",
					});
				} else {
					await deleteSavedOtp(normalizedClientEmail);
				}
			},
		});

		return context.json<APIResponse<{ link_id: string }>>({
			success: true,
			code: 200,
			data: {
				link_id: otp_id,
			},
		});
	},
);
