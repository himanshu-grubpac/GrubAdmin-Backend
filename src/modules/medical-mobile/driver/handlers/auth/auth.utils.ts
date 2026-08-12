import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { saveMedicalEmployeeOtp } from "@/db/actions/medical-otp.actions.ts";
import { services } from "@/services";
import type { GetUniqueMedicalEmployeeResponse } from "@/db/actions/medical/employee.actions";
import type { vertical_medical_employee } from "@/db/types";

export type MedicalHandlerEmployee = {
	type: "handler";
	employee: vertical_medical_employee;
};

export function assertHandlerEmployee(
	employee: GetUniqueMedicalEmployeeResponse,
): asserts employee is MedicalHandlerEmployee {
	if (!employee) {
		throw new APIError("No employee can be found!", undefined, undefined, 400);
	}
	if (employee.type !== "handler") {
		throw new APIError(
			"Unauthorized access... please contact the admin",
			undefined,
			undefined,
			403,
		);
	}
}

export const sendOtpToHandler = async (
	employee: MedicalHandlerEmployee,
	for_what: "login" | "forget_password" | "set_new_password" = "login",
) => {
	if (employee.employee.status === "suspended") {
		throw new APIError("Your account has been suspended!", undefined, undefined, 400);
	}

	const employeeEmail = employee.employee.email;
	if (!employeeEmail) {
		throw new APIError("No email found for this account!", undefined, undefined, 400);
	}

	const otp = Otp.generateOtp(4);

	await saveMedicalEmployeeOtp({
		email: employeeEmail,
		otp,
		role: "handler",
		for_what,
	});

	const subject =
		for_what === "login"
			? "Medical Driver - Login OTP"
			: "Medical Driver - Reset Password OTP";
	const text =
		for_what === "login"
			? `Your OTP to log into the Medical Driver app is ${otp}`
			: `Your OTP for resetting your password is ${otp}`;

	await services.mailer.sendEmail({
		from: "ankan@sqaby.com",
		subject,
		to: employeeEmail,
		text,
	});

	return { otp, email: employeeEmail };
};

export function getHandlerClientId(employee: MedicalHandlerEmployee): string {
	return employee.employee.client_id ?? "";
}
