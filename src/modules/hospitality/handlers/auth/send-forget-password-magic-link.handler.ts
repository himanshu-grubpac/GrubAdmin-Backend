import { createHandlers } from "@/utils/hono-factory.ts";
import { sendForgetPasswordMagicLinkRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { saveOtp } from "@/db/actions/otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import crypto from "crypto";
import { prisma } from "@/db";

export const sendForgetPasswordMagicLinkHandler = createHandlers(
	sendForgetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");

		const clientRecord = await prisma.client.findFirst({
			where: { email },
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "hospitality.auth.login.SUSPENDED");
		}

		const clientEmail = clientRecord.email;
		if (!clientEmail) {
			throw new APIError(undefined, "hospitality.auth.login.EMAIL_NOT_FOUND");
		}

		const token = crypto.randomBytes(32).toString("hex");

		const updatedOtpRecord = await saveOtp({
			otp_id: undefined,
			email: clientEmail,
			otp: token,
			role: "admin",
			for_what: "forget_password",
		});

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;
		const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(clientEmail)}&link_id=${otp_id}`;

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Hospitality Portal - Reset Password Link",
			to: clientEmail,
			text: `Click the link below to reset your password (LINK_ID: ${otp_id}):\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nfor_what: forget-send`,
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
