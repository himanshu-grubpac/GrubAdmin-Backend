import { createHandlers } from "@/utils/hono-factory.ts";
import { sendOtpRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import {
	getSavedDeliveryEmployeeOtp,
	saveDeliveryEmployeeOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { getCookie, setCookie } from "hono/cookie";
import { prisma } from "@/db";

export const sendOtpHandler = createHandlers(
	sendOtpRequestBodyValidator,
	async (context) => {
		const { email, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const clientRecord = await prisma.client.findFirst({
			where: { email },
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== "Hospitality") {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
		}

		if (clientRecord.status !== "active" && clientRecord.status !== "inactive") {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_INACTIVE");
		}

		const clientEmail = clientRecord.email;
		if (!clientEmail) {
			throw new APIError(undefined, "hospitality.auth.login.EMAIL_NOT_FOUND");
		}

		let savedOtp = null;
		if (target_otp_id) {
			savedOtp = await getSavedDeliveryEmployeeOtp(clientEmail, target_otp_id);
		} else {
			savedOtp = await getSavedDeliveryEmployeeOtp(clientEmail);
		}

		if (savedOtp) {
			const timeDiff = Date.now() - new Date(savedOtp.createdAt).getTime();
			const cooldown = 60000;
			if (timeDiff < cooldown) {
				throw new APIError("Please wait 60 seconds before requesting a new OTP.", undefined, undefined, 429);
			}
		}

		const otp = Otp.generateOtp(4);

		const updatedOtpRecord = await saveDeliveryEmployeeOtp({
			otp_id: savedOtp?.otp_id,
			email: clientEmail,
			otp,
			role: "admin",
			for_what: "login",
		});

		if (!updatedOtpRecord) {
			throw new APIError(undefined, "hospitality.auth.login.OTP_SAVE_FAILED");
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
			subject: "Hospitality Portal - Login OTP",
			to: clientEmail,
			text: `Your OTP to log into your hospitality platform is ${otp} (OTP Session ID: ${otp_id})\n\nfor_what: login-send`,
		});

		return context.json<APIResponse<{ otp_id: string; otp_details: { type: string; values: string[] } }>>({
			success: true,
			code: 200,
			data: {
				otp_id,
				otp_details: {
					type: "email",
					values: [clientEmail],
				},
			},
		});
	},
);
