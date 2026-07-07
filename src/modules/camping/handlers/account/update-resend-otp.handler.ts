import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { prisma } from "@/db";
import { services } from "@/services";
import {
	getSavedCampingOtp,
	saveCampingOtp,
} from "@/db/actions/camping-otp.actions.ts";
import { setCookie } from "hono/cookie";

export const updateAccountResendOtpHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");

		const client = await prisma.client.findUnique({
			where: { id: client_id },
		});

		if (!client?.email) {
			throw new APIError(undefined, "camping.auth.login.EMAIL_NOT_FOUND");
		}

		const savedOtp = await getSavedCampingOtp(client.email);

		const otp = Otp.generateOtp(4);
		const updatedOtpRecord = await saveCampingOtp({
			otp_id: savedOtp?.otp_id,
			email: client.email,
			otp,
			role: "admin",
			for_what: "set_new_password",
		});

		setCookie(context, "otp_id", updatedOtpRecord?.otp_id || "", {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "Camping Portal - Resend OTP for Profile Update",
			to: client.email,
			text: `Your new OTP to confirm profile update is ${otp}`,
		});

		return context.json({
			success: true,
			code: 200,
			message: "OTP resent successfully",
		});
	},
);
