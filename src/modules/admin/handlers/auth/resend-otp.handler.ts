import { createHandlers } from "@/utils/hono-factory";
import { resendOtpRequestBodyValidator } from "../../validators/auth.validators";
import { getUniqueAdmin } from "@/db/actions/admin.actions";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp";
import { getSavedOtp, saveOtp } from "@/db/actions/otp.actions";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const resendOtpHandler = createHandlers(
	resendOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const admin = await getUniqueAdmin({
			email: normalizedEmail,
		});

		if (!admin) {
			throw new APIError("No admin found!", undefined, undefined, 404);
		}

		if (admin.user.status === "suspended") {
			throw new APIError(
				"Your account has been suspended!",
				undefined,
				undefined,
				400,
			);
		}

		const sentOtp = await getSavedOtp(normalizedEmail);

		if (!sentOtp) {
			throw new APIError(
				"Please first send the otp to call this api",
				undefined,
				undefined,
				400,
			);
		}

		const otp = Otp.generateOtp(4);

		await saveOtp({
			email: normalizedEmail,
			otp,
			role: admin.type,
			for_what: sentOtp.for_what,
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "OTP",
			to: normalizedEmail,
			text: `Your OTP is ${otp}`,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);

