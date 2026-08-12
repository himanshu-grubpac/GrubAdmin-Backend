import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { saveMedicalEmployeeOtp } from "@/db/actions/medical-otp.actions.ts";
import { services } from "@/services";
import type { GetUniqueMedicalEmployeeResponse } from "@/db/actions/medical/employee.actions";
import type { client } from "@/db/types";

export type MedicalOwnerEmployee = {
	type: "admin";
	employee: client;
};

export function assertOwnerAdmin(
	employee: GetUniqueMedicalEmployeeResponse,
): asserts employee is MedicalOwnerEmployee {
	if (!employee) {
		throw new APIError("No employee can be found!", undefined, undefined, 400);
	}
	if (employee.type !== "admin") {
		throw new APIError(
			"Unauthorized access... please contact the admin",
			undefined,
			undefined,
			403,
		);
	}
}

export function getOwnerClientId(employee: MedicalOwnerEmployee): string {
	return employee.employee.id;
}

export const getOwnerDisplayName = (owner: client): string =>
	owner.organization_name?.trim() || owner.name?.trim() || "Owner";

export const sendOtpToOwner = async (
	employee: MedicalOwnerEmployee,
	for_what: "login" | "forget_password" | "set_new_password" = "login",
) => {
	if (employee.employee.status === "suspended") {
		throw new APIError("Your account has been suspended!", undefined, undefined, 400);
	}

	const ownerEmail = employee.employee.email;
	if (!ownerEmail) {
		throw new APIError("No email found for this account!", undefined, undefined, 400);
	}

	const otp = Otp.generateOtp(4);

	await saveMedicalEmployeeOtp({
		email: ownerEmail,
		otp,
		role: "admin",
		for_what,
	});

	const subject =
		for_what === "login"
			? "Medical Owner - Login OTP"
			: "Medical Owner - Reset Password OTP";
	const text =
		for_what === "login"
			? `Your OTP to log into the Medical Owner app is ${otp}`
			: `Your OTP for resetting your password is ${otp}`;

	await services.mailer.sendEmail({
		from: "ankan@sqaby.com",
		subject,
		to: ownerEmail,
		text,
	});

	return { otp, email: ownerEmail };
};
