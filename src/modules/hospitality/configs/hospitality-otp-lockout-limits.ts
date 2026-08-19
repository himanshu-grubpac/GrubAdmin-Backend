/** P2-13 — account lockout after this many failed OTP/magic-link attempts (MySQL counter). */
export const HOSPITALITY_OTP_MAX_ATTEMPTS = 5;

/** P2-13 — lockout window once max attempts reached. */
export const HOSPITALITY_OTP_LOCK_DURATION_MINUTES = 30;

/** P2-13 — attempt counter TTL; mirrors legacy Mongo OtpAttempt 24h expiry. */
export const HOSPITALITY_OTP_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;

/** Per-OTP record failed guesses before OTP is invalidated (hospitality_employee_otp.failed_attempts). */
export const HOSPITALITY_OTP_PER_RECORD_MAX_FAILED = 3;
