import { createHandlers } from "@/utils/hono-factory";
import { sendOtpRequestBodyValidator } from "../../validators/auth.validators";
import { getUniqueAdmin } from "@/db/actions/admin.actions";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp";
import { getSavedOtp, saveOtp } from "@/db/actions/otp.actions";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";

export const sendOtpHandler = createHandlers(
	sendOtpRequestBodyValidator,
	async (context) => {
		const { email } = context.req.valid("json");

		const admin = await getUniqueAdmin({
			email,
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

		const sentOtp = await getSavedOtp(email);

		if (sentOtp) {
			throw new APIError(
				"An otp has has already been sent, try re-sending the OTP!",
				undefined,
				undefined,
				400,
			);
		}

		const otp = Otp.generateOtp(4);

		await saveOtp({
			email,
			otp,
			role: admin.type,
			for_what: "login",
		});

		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: "OTP",
			to: email,
			text: `Your OTP is ${otp}`,
		});

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);

