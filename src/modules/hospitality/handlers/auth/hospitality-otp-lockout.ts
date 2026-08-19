import { normalizeAuthEmail } from "./auth.utils";
import {
	HOSPITALITY_OTP_ATTEMPT_TTL_MS,
	HOSPITALITY_OTP_LOCK_DURATION_MINUTES,
	HOSPITALITY_OTP_MAX_ATTEMPTS,
	HOSPITALITY_OTP_PER_RECORD_MAX_FAILED,
} from "hospitality/configs/hospitality-otp-lockout-limits";

export {
	HOSPITALITY_OTP_ATTEMPT_TTL_MS,
	HOSPITALITY_OTP_LOCK_DURATION_MINUTES,
	HOSPITALITY_OTP_MAX_ATTEMPTS,
	HOSPITALITY_OTP_PER_RECORD_MAX_FAILED,
};

const HOSPITALITY_LOGIN_LOCK_SCOPE = "hospitality-login-otp";

export const getHospitalityLoginOtpLockKey = (email: string) => ({
	email: normalizeAuthEmail(email),
	ip_address: HOSPITALITY_LOGIN_LOCK_SCOPE,
});

export const getHospitalityUserOtpLockKey = (userId: string, email?: string | null) => ({
	email: email ? normalizeAuthEmail(email) : userId,
	ip_address: `hospitality-user:${userId}`,
});
