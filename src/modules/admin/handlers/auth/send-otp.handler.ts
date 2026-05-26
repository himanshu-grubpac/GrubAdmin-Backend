import { createHandlers } from "@/utils/hono-factory";
import { sendOtpRequestBodyValidator } from "../../validators/auth.validators";
import { getUniqueAdmin } from "@/db/actions/admin.actions";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp";
import { getSavedOtp, saveOtp } from "@/db/actions/otp.actions";
import { services } from "@/services";
import { MAIL } from "@/configs/env";
import type { APIResponse } from "@/types/api";

export const sendOtpHandler = createHandlers(
	sendOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const admin = await getUniqueAdmin({
			email: normalizedEmail,
		});

		if (!admin) {
			// Return a generic success — do NOT reveal whether this email exists.
			// Returning 404 allows attackers to enumerate valid admin email addresses.
			return context.json<APIResponse>({ success: true, code: 200 }, 200);
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

		if (sentOtp) {
			throw new APIError(
				"An otp has has already been sent, try re-sending the OTP!",
				undefined,
				undefined,
				400,
			);
		}

		const otp = Otp.generateOtp(4); // 4 digits = 10,000 combinations

		await saveOtp({
			email: normalizedEmail,
			otp,
			role: admin.type ?? "admin",
			for_what: "login",
		});

		await services.mailer.sendEmail({
			from: MAIL,
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

