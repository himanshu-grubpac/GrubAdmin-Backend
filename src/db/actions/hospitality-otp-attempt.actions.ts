import { prisma } from "@/db";
import type { hospitality_otp_attempt } from "@/db/prisma";
import {
	HOSPITALITY_OTP_ATTEMPT_TTL_MS,
	HOSPITALITY_OTP_LOCK_DURATION_MINUTES,
	HOSPITALITY_OTP_MAX_ATTEMPTS,
} from "hospitality/configs/hospitality-otp-lockout-limits";

interface HospitalityOtpAttemptKey {
	email: string;
	ip_address: string;
}

interface IncrementHospitalityOtpAttemptArgs extends HospitalityOtpAttemptKey {
	max_attempts?: number;
	lock_duration_minutes?: number;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toScopeKey = (args: HospitalityOtpAttemptKey) => ({
	email: normalizeEmail(args.email),
	scope: args.ip_address.trim(),
});

export const isHospitalityOtpAttemptRecordExpired = (
	lastAttempt: Date,
	nowMs = Date.now(),
	ttlMs = HOSPITALITY_OTP_ATTEMPT_TTL_MS,
): boolean => nowMs - lastAttempt.getTime() > ttlMs;

export const shouldLockHospitalityOtpAttempts = (
	attempts: number,
	maxAttempts = HOSPITALITY_OTP_MAX_ATTEMPTS,
): boolean => attempts >= maxAttempts;

export const computeHospitalityOtpLockUntil = (
	nowMs: number,
	lockDurationMinutes = HOSPITALITY_OTP_LOCK_DURATION_MINUTES,
): Date => new Date(nowMs + lockDurationMinutes * 60 * 1000);

const getAttemptRecord = async (args: HospitalityOtpAttemptKey) => {
	const key = toScopeKey(args);
	return prisma.hospitality_otp_attempt.findUnique({
		where: { email_scope: key },
	});
};

const resetExpiredAttemptRecord = async (record: hospitality_otp_attempt) => {
	if (!isHospitalityOtpAttemptRecordExpired(record.last_attempt)) {
		return record;
	}

	return prisma.hospitality_otp_attempt.update({
		where: { id: record.id },
		data: {
			attempts: 0,
			is_locked: false,
			lock_until: null,
			last_attempt: new Date(),
		},
	});
};

const unlockIfPastLockUntil = async (record: hospitality_otp_attempt) => {
	if (!record.is_locked || !record.lock_until) {
		return record;
	}

	if (Date.now() < record.lock_until.getTime()) {
		return record;
	}

	return prisma.hospitality_otp_attempt.update({
		where: { id: record.id },
		data: {
			attempts: 0,
			is_locked: false,
			lock_until: null,
			last_attempt: new Date(),
		},
	});
};

const resolveAttemptRecord = async (args: HospitalityOtpAttemptKey) => {
	const record = await getAttemptRecord(args);
	if (!record) {
		return null;
	}

	const afterTtl = await resetExpiredAttemptRecord(record);
	return unlockIfPastLockUntil(afterTtl);
};

export const getHospitalityOtpAttempt = async (args: HospitalityOtpAttemptKey) => {
	return resolveAttemptRecord(args);
};

export const isOtpAttemptLocked = async (args: HospitalityOtpAttemptKey): Promise<boolean> => {
	const record = await resolveAttemptRecord(args);
	if (!record) {
		return false;
	}

	return Boolean(record.is_locked && record.lock_until && Date.now() < record.lock_until.getTime());
};

export const incrementOtpAttempt = async (args: IncrementHospitalityOtpAttemptArgs) => {
	const {
		max_attempts = HOSPITALITY_OTP_MAX_ATTEMPTS,
		lock_duration_minutes = HOSPITALITY_OTP_LOCK_DURATION_MINUTES,
		...keyArgs
	} = args;
	const key = toScopeKey(keyArgs);
	const now = new Date();

	return prisma.$transaction(async (tx) => {
		const existing = await tx.hospitality_otp_attempt.findUnique({
			where: { email_scope: key },
		});

		if (existing && isHospitalityOtpAttemptRecordExpired(existing.last_attempt)) {
			await tx.hospitality_otp_attempt.update({
				where: { id: existing.id },
				data: {
					attempts: 0,
					is_locked: false,
					lock_until: null,
					last_attempt: now,
				},
			});
		}

		const updated = await tx.hospitality_otp_attempt.upsert({
			where: { email_scope: key },
			create: {
				email: key.email,
				scope: key.scope,
				attempts: 1,
				last_attempt: now,
				is_locked: false,
				lock_until: null,
			},
			update: {
				attempts: { increment: 1 },
				last_attempt: now,
			},
		});

		if (!shouldLockHospitalityOtpAttempts(updated.attempts, max_attempts)) {
			return updated;
		}

		if (updated.is_locked && updated.lock_until && Date.now() < updated.lock_until.getTime()) {
			return updated;
		}

		return tx.hospitality_otp_attempt.update({
			where: { id: updated.id },
			data: {
				is_locked: true,
				lock_until: computeHospitalityOtpLockUntil(Date.now(), lock_duration_minutes),
			},
		});
	});
};

export const resetOtpAttempt = async (args: HospitalityOtpAttemptKey) => {
	const key = toScopeKey(args);
	const now = new Date();

	return prisma.hospitality_otp_attempt.upsert({
		where: { email_scope: key },
		create: {
			email: key.email,
			scope: key.scope,
			attempts: 0,
			last_attempt: now,
			is_locked: false,
			lock_until: null,
		},
		update: {
			attempts: 0,
			is_locked: false,
			lock_until: null,
			last_attempt: now,
		},
	});
};

export const unlockOtpAttempt = async (args: HospitalityOtpAttemptKey) => {
	const key = toScopeKey(args);
	return prisma.hospitality_otp_attempt.updateMany({
		where: { email: key.email, scope: key.scope },
		data: {
			attempts: 0,
			is_locked: false,
			lock_until: null,
			last_attempt: new Date(),
		},
	});
};

export const getOtpLockoutRemaining = async (
	args: HospitalityOtpAttemptKey,
): Promise<number | null> => {
	const record = await resolveAttemptRecord(args);

	if (!record?.is_locked || !record.lock_until) {
		return null;
	}

	const remainingMs = record.lock_until.getTime() - Date.now();
	if (remainingMs <= 0) {
		return null;
	}

	return Math.ceil(remainingMs / (1000 * 60));
};
