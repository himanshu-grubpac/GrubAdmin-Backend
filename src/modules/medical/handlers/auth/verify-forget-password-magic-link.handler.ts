import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyForgetPasswordMagicLinkRequestBodyValidator } from "medical/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { resolveMessageTemplate } from "@/utils/message";
import type { APIResponse } from "@/types/api";
import { getSavedMedicalEmployeeOtp, compareOtp } from "@/db/actions/medical-otp.actions.ts";

export const verifyForgetPasswordMagicLinkHandler = createHandlers(
	verifyForgetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email, token } = context.req.valid("json");

		const savedOtp = await getSavedMedicalEmployeeOtp(email);

		if (!savedOtp) {
			throw new APIError(
				"The reset link is invalid or has expired.",
				"medical.auth.login.OTP_EXPIRED",
			);
		}

		const isValid = await compareOtp(token, savedOtp.otp);

		if (!isValid) {
			throw new APIError(
				"The reset link is invalid or has expired.",
				"medical.auth.login.OTP_EXPIRED",
			);
		}

		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("medical.auth.login.OTP_VERIFIED"),
		});
	},
);
