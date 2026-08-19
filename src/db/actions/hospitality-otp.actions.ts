import type { HospitalityEmployeeRoleType } from "@/types/common";
import { prisma } from "@/db";
import { Otp } from "@/utils/otp.ts";
import { Bcrypt } from "@/utils/bcrypt";
import { Prisma, type hospitality_employee_otp } from "@/db/prisma";

const OTP_TTL_MS = 5 * 60 * 1000;

export type HospitalityEmployeeOtpRecord = {
	id: string;
	email: string;
	role: HospitalityEmployeeRoleType;
	otp: string;
	otp_id: string;
	for_what: "login" | "forget_password" | "set_new_password" | "delete_account";
	metadata?: unknown;
	failed_attempts: number;
	createdAt: Date;
	updatedAt: Date;
};

interface SaveHospitalityEmployeeOtpArgs {
	id?: string;
	otp_id?: string;
	email: string;
	otp: string;
	role: HospitalityEmployeeRoleType;
	for_what: "login" | "forget_password" | "set_new_password" | "delete_account";
	metadata?: unknown;
}

const otpNotExpiredWhere = (): Prisma.hospitality_employee_otpWhereInput => ({
	created_at: { gte: new Date(Date.now() - OTP_TTL_MS) },
});

const toRecord = (row: hospitality_employee_otp): HospitalityEmployeeOtpRecord => ({
	id: row.id,
	email: row.email,
	role: row.role as HospitalityEmployeeRoleType,
	otp: row.otp,
	otp_id: row.otp_id,
	for_what: row.for_what,
	metadata: row.metadata ?? undefined,
	failed_attempts: row.failed_attempts,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

export const hashOtp = async (otp: string): Promise<string> => {
	return await Bcrypt.generateHash({ data: otp });
};

export const compareOtp = async (plainOtp: string, hashedOtp: string): Promise<boolean> => {
	return await Bcrypt.compareHash({ data: plainOtp, hashedValue: hashedOtp });
};

export const saveHospitalityEmployeeOtp = async (args: SaveHospitalityEmployeeOtpArgs) => {
	const hashedOtp = await hashOtp(args.otp);
	const normalizedEmail = args.email.trim().toLowerCase();
	const now = new Date();
	// Prisma Json? fields reject raw `null`; use DbNull to clear / omit value.
	const metadata: Prisma.InputJsonValue | typeof Prisma.DbNull =
		args.metadata === undefined
			? Prisma.DbNull
			: (args.metadata as Prisma.InputJsonValue);

	if (args.id || args.otp_id) {
		const existing = await prisma.hospitality_employee_otp.findFirst({
			where: args.id
				? { id: args.id, email: normalizedEmail }
				: { otp_id: args.otp_id, email: normalizedEmail },
		});

		if (!existing) {
			return null;
		}

		const updated = await prisma.hospitality_employee_otp.update({
			where: { id: existing.id },
			data: {
				email: normalizedEmail,
				otp: hashedOtp,
				role: args.role,
				for_what: args.for_what,
				metadata,
				failed_attempts: 0,
				created_at: now,
			},
		});

		return toRecord(updated);
	}

	const otp_id = Otp.generateOtp(6);

	const created = await prisma.hospitality_employee_otp.create({
		data: {
			email: normalizedEmail,
			otp: hashedOtp,
			otp_id,
			role: args.role,
			for_what: args.for_what,
			metadata,
			failed_attempts: 0,
		},
	});

	return toRecord(created);
};

export const getSavedHospitalityEmployeeOtp = async (email: string, otp_id?: string) => {
	const normalizedEmail = email.trim().toLowerCase();
	const row = await prisma.hospitality_employee_otp.findFirst({
		where: {
			email: normalizedEmail,
			...(otp_id ? { otp_id } : {}),
			...otpNotExpiredWhere(),
		},
		orderBy: { created_at: "desc" },
	});

	return row ? toRecord(row) : null;
};

export const deleteSavedHospitalityEmployeeOtp = async (email: string) => {
	const normalizedEmail = email.trim().toLowerCase();
	return prisma.hospitality_employee_otp.deleteMany({ where: { email: normalizedEmail } });
};

export const deleteHospitalityEmployeeOtpById = async (id: string) => {
	return prisma.hospitality_employee_otp.deleteMany({ where: { id } });
};

export const incrementHospitalityEmployeeOtpFailedAttempts = async (id: string) => {
	const updated = await prisma.hospitality_employee_otp.update({
		where: { id },
		data: { failed_attempts: { increment: 1 } },
	});
	return updated.failed_attempts;
};

export const consumeHospitalityEmployeeOtp = async (
	email: string,
	plainOtp: string,
	otp_id?: string,
) => {
	const normalizedEmail = email.trim().toLowerCase();

	return prisma.$transaction(async (tx) => {
		const savedOtp = await tx.hospitality_employee_otp.findFirst({
			where: {
				email: normalizedEmail,
				...(otp_id ? { otp_id } : {}),
				...otpNotExpiredWhere(),
			},
			orderBy: { created_at: "desc" },
		});

		if (!savedOtp) {
			return { consumed: false as const, reason: "expired" as const };
		}

		const isMatch = await compareOtp(plainOtp, savedOtp.otp);
		if (!isMatch || savedOtp.for_what !== "login") {
			return { consumed: false as const, reason: "invalid" as const, savedOtp: toRecord(savedOtp) };
		}

		const deleted = await tx.hospitality_employee_otp.deleteMany({ where: { id: savedOtp.id } });
		if (deleted.count === 0) {
			return { consumed: false as const, reason: "consumed" as const };
		}

		return { consumed: true as const, savedOtp: toRecord(savedOtp) };
	});
};
