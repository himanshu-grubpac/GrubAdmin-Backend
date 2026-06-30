import { createHandlers } from "@/utils/hono-factory.ts";
import { confirmResetPasswordRequestBodyValidator } from "medical/validators/auth.validators.ts";
import {
	getSavedMedicalEmployeeOtp,
	compareOtp,
	deleteSavedMedicalEmployeeOtp,
} from "@/db/actions/medical-otp.actions.ts";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import { getUniqueMedicalEmployee, updateMedicalEmployee } from "@/db/actions/medical/employee.actions.ts";
import type { APIResponse } from "@/types/api";

export const confirmResetPasswordHandler = createHandlers(
	confirmResetPasswordRequestBodyValidator,
	async (context) => {
		const { email, otp, password } = context.req.valid("json");
		const normalizedEmail = email.trim().toLowerCase();

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			"unknown";

		if (await isOtpAttemptLocked({ email: normalizedEmail, ip_address })) {
			const remainingMinutes = await getOtpLockoutRemaining({ email: normalizedEmail, ip_address });
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const savedOtp = await getSavedMedicalEmployeeOtp(normalizedEmail);

		if (!savedOtp?.metadata?.is_password_reset) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError(
				"The password is either expired or was never sent!",
				undefined,
				undefined,
				400,
			);
		}

		if (!(await compareOtp(otp, savedOtp.otp))) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("The otp is invalid", undefined, undefined, 400);
		}

		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		const employee = await getUniqueMedicalEmployee({ email: normalizedEmail });

		if (!employee) {
			throw new APIError("Account not found", undefined, undefined, 404);
		}

		if (employee.employee.status === "suspended") {
			throw new APIError(
				"Your account is suspended. Password reset is not allowed.",
				undefined,
				undefined,
				403,
			);
		}

		if (employee.employee.password) {
			const isSamePassword = await Bcrypt.compareHash({
				data: password,
				hashedValue: employee.employee.password,
			});

			if (isSamePassword) {
				throw new APIError(
					"New password must be different from your old password!",
					undefined,
					undefined,
					400,
				);
			}
		}

		const hashedPassword = await Bcrypt.generateHash({ data: password, saltLength: 10 });

		await updateMedicalEmployee({
			id: employee.employee.id,
			email: normalizedEmail,
			password: hashedPassword,
			type: employee.type as "admin" | "manager" | "handler",
		});

		await deleteSavedMedicalEmployeeOtp(normalizedEmail);

		const token = JWT.signMedicalAuthToken({
			id: employee.employee.id,
			role: employee.type === "admin" ? "admin" : employee.type,
		});

		return context.json<APIResponse<{ auth_token: string }>>(
			{
				success: true,
				code: 200,
				data: { auth_token: token },
			},
			{ status: 200 },
		);
	},
);
