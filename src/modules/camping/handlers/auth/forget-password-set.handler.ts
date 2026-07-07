import { createHandlers } from "@/utils/hono-factory.ts";
import { forgetPasswordSetPasswordValidator } from "camping/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";
import {
	deleteSavedCampingOtp,
	getSavedCampingOtp,
} from "@/db/actions/camping-otp.actions.ts";

export const forgetPasswordSetHandler = createHandlers(
	forgetPasswordSetPasswordValidator,
	async (context) => {
		const { email, otp, password } = context.req.valid("json");
		const normalizedPassword = password.trim();

		const savedOtp = await getSavedCampingOtp(email);

		if (!savedOtp) {
			throw new APIError(undefined, "camping.auth.login.OTP_EXPIRED");
		}

		if (savedOtp.for_what !== "forget_password") {
			throw new APIError(undefined, "camping.auth.login.OTP_INVALID");
		}

		const { compareOtp } = await import("@/db/actions/camping-otp.actions.ts");
		if (!(await compareOtp(otp, savedOtp.otp))) {
			throw new APIError(undefined, "camping.auth.login.OTP_INVALID");
		}

		const clientRecord = await prisma.client.findFirst({
			where: { email },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "camping.auth.login.ACCOUNT_NOT_FOUND");
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: normalizedPassword,
			saltLength: 10,
		});

		await prisma.client.update({
			where: { id: clientRecord.id },
			data: { password: hashedPassword },
		});

		await deleteSavedCampingOtp(email);

		return context.json({
			success: true,
			...resolveMessageTemplate("camping.auth.PASSWORD_SET_SUCCESS"),
		});
	},
);
