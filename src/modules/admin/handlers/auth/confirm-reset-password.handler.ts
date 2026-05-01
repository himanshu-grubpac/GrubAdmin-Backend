import { createHandlers } from "@/utils/hono-factory.ts";
import { confirmResetPasswordRequestBodyValidator } from "@/modules/admin/validators/auth.validators.ts";
import { getSavedOtp } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { updateAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";

export const confirmResetPasswordHandler = createHandlers(
	confirmResetPasswordRequestBodyValidator,
	async (context) => {
		const { email, otp, password } = context.req.valid("json");

		const savedOtp = await getSavedOtp(email);

		if (!savedOtp || !savedOtp.is_password_reset) {
			throw new APIError(
				"The password is either expired or was never sent!",
				undefined,
				undefined,
				400,
			);
		}

		if (otp !== savedOtp.otp) {
			throw new APIError("The otp is invalid", undefined, undefined, 400);
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		await updateAdmin({
			email,
			data: {
				password: hashedPassword,
			},
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);

