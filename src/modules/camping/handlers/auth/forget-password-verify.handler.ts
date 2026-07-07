import { createHandlers } from "@/utils/hono-factory.ts";
import { forgetPasswordVerifyOtpValidator } from "camping/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import {
	getSavedCampingOtp,
	compareOtp,
} from "@/db/actions/camping-otp.actions.ts";
import { CampingEmployeeOtp } from "@/db/mongo-schema/camping-employee-otp.model.ts";
import type { APIResponse } from "@/types/api";

export const forgetPasswordVerifyHandler = createHandlers(
	forgetPasswordVerifyOtpValidator,
	async (context) => {
		const { email, otp } = context.req.valid("json");

		const savedOtp = await getSavedCampingOtp(email);

		if (!savedOtp) {
			throw new APIError(undefined, "camping.auth.login.OTP_EXPIRED");
		}

		if (savedOtp.for_what !== "forget_password") {
			throw new APIError(undefined, "camping.auth.login.OTP_INVALID");
		}

		const isMatch = await compareOtp(otp, savedOtp.otp);

		if (!isMatch) {
			const attempts = (savedOtp.failed_attempts ?? 0) + 1;
			if (attempts >= 3) {
				await CampingEmployeeOtp.deleteOne({ _id: savedOtp._id });
				throw new APIError(undefined, "camping.auth.login.OTP_EXPIRED");
			} else {
				await CampingEmployeeOtp.updateOne({ _id: savedOtp._id }, { failed_attempts: attempts });
				throw new APIError(undefined, "camping.auth.login.OTP_INVALID");
			}
		}

		return context.json<APIResponse<{ verified: boolean }>>({
			success: true,
			code: 200,
			data: { verified: true },
		});
	},
);
