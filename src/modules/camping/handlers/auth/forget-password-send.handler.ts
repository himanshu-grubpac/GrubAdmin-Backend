import { createHandlers } from "@/utils/hono-factory.ts";
import { forgetPasswordSendOtpValidator } from "camping/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import {
	getSavedCampingOtp,
	saveCampingOtp,
} from "@/db/actions/camping-otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "@/db";
import { buildCampingClientLookupWhere, normalizeAuthEmail } from "./auth.utils";

export const forgetPasswordSendHandler = createHandlers(
	forgetPasswordSendOtpValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);

		const clientRecord = await prisma.client.findFirst({
			where: buildCampingClientLookupWhere(normalizedEmail),
		});

		if (!clientRecord) {
			throw new APIError(undefined, "camping.auth.login.ACCOUNT_NOT_FOUND");
		}

		const clientEmail = clientRecord.email;
		if (!clientEmail) {
			throw new APIError(undefined, "camping.auth.login.EMAIL_NOT_FOUND");
		}

		const savedOtp = await getSavedCampingOtp(clientEmail);

		if (savedOtp) {
			const timeDiff = Date.now() - new Date(savedOtp.createdAt).getTime();
			const cooldown = 60000;
			if (timeDiff < cooldown) {
				throw new APIError("Please wait 60 seconds before requesting a new OTP.", undefined, undefined, 429);
			}
		}

		const otp = Otp.generateOtp(4);

		const updatedOtpRecord = await saveCampingOtp({
			otp_id: savedOtp?.otp_id,
			email: clientEmail,
			otp,
			role: "admin",
			for_what: "forget_password",
		});

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "camping.auth.login.OTP_SAVE_FAILED");
		}

		const otp_id = updatedOtpRecord.otp_id;

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Camping Portal - Reset Password OTP",
			to: clientEmail,
			text: `Your OTP to reset your camping password is ${otp} (OTP Session ID: ${otp_id})`,
		});

		return context.json<APIResponse<{ otp_id: string }>>({
			success: true,
			code: 200,
			data: { otp_id },
		});
	},
);
