import { createHandlers } from "@/utils/hono-factory.ts";
import { setNewPasswordRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/auth.validators.ts";
import { APIError } from "@/types/error";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { JWT } from "@/utils/jwt.ts";
import {
	deleteSavedMedicalEmployeeOtp,
	getSavedMedicalEmployeeOtp,
	compareOtp,
} from "@/db/actions/medical-otp.actions.ts";
import { assertHandlerEmployee } from "./auth.utils.ts";

export const setNewPasswordHandler = createHandlers(
	setNewPasswordRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");
		const { password, email, phone } = body;
		const bodyToken = body.auth_token || body["auth-token"] || body.token;

		let userId: string | undefined;

		if (context.req.header("Authorization")?.startsWith("Bearer ")) {
			const token = context.req.header("Authorization")!.slice("Bearer ".length);
			const decoded = JWT.verifyMedicalAuthToken(token);
			userId = decoded.id;
		} else if (bodyToken) {
			try {
				const decoded = JWT.verifyMedicalAuthToken(bodyToken);
				if ((decoded as any).type !== "password_reset") {
					throw new APIError("Invalid auth token", undefined, undefined, 401);
				}
				userId = decoded.id;
			} catch (error) {
				if (error instanceof APIError) throw error;

				if (!email && !phone) {
					throw new APIError(
						"Email or phone is required for OTP-based reset!",
						undefined,
						undefined,
						400,
					);
				}

				const employeeForOtp = await getUniqueMedicalEmployee({ email, phone });
				assertHandlerEmployee(employeeForOtp);

				const savedOtp = await getSavedMedicalEmployeeOtp(employeeForOtp.employee.email);
				const isOtpValid = savedOtp ? await compareOtp(bodyToken, savedOtp.otp) : false;
				if (!savedOtp || !isOtpValid) {
					throw new APIError("Invalid OTP token", undefined, undefined, 401);
				}

				userId = employeeForOtp.employee.id;
			}
		} else {
			throw new APIError(
				"Authentication token or email/token pair is required!",
				undefined,
				undefined,
				401,
			);
		}

		const employee = await getUniqueMedicalEmployee({ id: userId });
		assertHandlerEmployee(employee);

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", undefined, undefined, 403);
		}

		const hashedPassword = await Bcrypt.generateHash({ data: password, saltLength: 10 });

		await prisma.vertical_medical_employee.update({
			where: { id: employee.employee.id },
			data: { password: hashedPassword },
		});

		await deleteSavedMedicalEmployeeOtp(employee.employee.email);

		return context.json<APIResponse>({
			success: true,
			code: 200,
			message: "Password set successfully",
		});
	},
);
