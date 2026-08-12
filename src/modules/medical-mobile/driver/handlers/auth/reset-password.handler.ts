import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordRequestBodyValidator } from "@/modules/medical-mobile/driver/validators/auth.validators.ts";
import {
	deleteSavedMedicalEmployeeOtp,
	getSavedMedicalEmployeeOtp,
	compareOtp,
} from "@/db/actions/medical-otp.actions.ts";
import { APIError } from "@/types/error";
import { getUniqueMedicalEmployee } from "@/db/actions/medical/employee.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { assertHandlerEmployee } from "./auth.utils.ts";

export const resetPasswordHandler = createHandlers(
	resetPasswordRequestBodyValidator,
	async (context) => {
		const { email, phone, otp, password } = context.req.valid("json");

		const employee = await getUniqueMedicalEmployee({ email, phone });
		assertHandlerEmployee(employee);

		const employeeEmail = employee.employee.email;
		const savedOtp = await getSavedMedicalEmployeeOtp(employeeEmail);

		if (!savedOtp) {
			throw new APIError(
				"The otp has either expired or the credentials are wrong! Please try sending a new otp!",
				undefined,
				undefined,
				400,
			);
		}

		const isOtpValid = await compareOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError("Invalid otp", undefined, undefined, 400);
		}

		await deleteSavedMedicalEmployeeOtp(employeeEmail);

		if (employee.employee.status === "suspended") {
			throw new APIError("Your account has been suspended!", undefined, undefined, 400);
		}

		const hashedPassword = await Bcrypt.generateHash({ data: password, saltLength: 10 });

		await prisma.vertical_medical_employee.update({
			where: { id: employee.employee.id },
			data: { password: hashedPassword },
		});

		return context.json<APIResponse>({ success: true, code: 200 });
	},
);
