import type { Context, MiddlewareHandler } from "hono";
import { hospitalityRateLimit } from "hospitality/middlewares/hospitality-rate-limit";

/** Shared hospitality auth IP throttle window — P2-11 (was 40 req / 15m for all auth routes). */
export const HOSPITALITY_AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

const clientIp = (c: Context): string =>
	c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
	c.req.header("x-real-ip") ||
	"unknown";

function scopedAuthLimit(scope: string, max: number): MiddlewareHandler {
	return hospitalityRateLimit({
		windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS,
		max,
		keyGenerator: (c) => `hospitality:${scope}:${clientIp(c)}`,
	});
}

/**
 * P2-11 — per-route IP limits (15m window). Account OTP lockout / cooldown still
 * handles brute-force; these caps curb credential stuffing and mail abuse.
 */
export const HOSPITALITY_AUTH_RATE_LIMITS = {
	login: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 10 },
	sendOtp: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 5 },
	verifyOtp: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 15 },
	resendOtp: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 5 },
	forgetPasswordSend: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 5 },
	forgetPasswordVerify: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 10 },
	resetPassword: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 10 },
	setPassword: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 10 },
	impersonate: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 10 },
	accountResendOtp: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 5 },
	transferVerify: { windowMs: HOSPITALITY_AUTH_RATE_WINDOW_MS, max: 10 },
} as const;

export const hospitalityAuthRateLimits = {
	login: scopedAuthLimit("auth:login", HOSPITALITY_AUTH_RATE_LIMITS.login.max),
	sendOtp: scopedAuthLimit("auth:send-otp", HOSPITALITY_AUTH_RATE_LIMITS.sendOtp.max),
	verifyOtp: scopedAuthLimit("auth:verify-otp", HOSPITALITY_AUTH_RATE_LIMITS.verifyOtp.max),
	resendOtp: scopedAuthLimit("auth:resend-otp", HOSPITALITY_AUTH_RATE_LIMITS.resendOtp.max),
	forgetPasswordSend: scopedAuthLimit(
		"auth:forget-send",
		HOSPITALITY_AUTH_RATE_LIMITS.forgetPasswordSend.max,
	),
	forgetPasswordVerify: scopedAuthLimit(
		"auth:forget-verify",
		HOSPITALITY_AUTH_RATE_LIMITS.forgetPasswordVerify.max,
	),
	resetPassword: scopedAuthLimit(
		"auth:reset-password",
		HOSPITALITY_AUTH_RATE_LIMITS.resetPassword.max,
	),
	setPassword: scopedAuthLimit("auth:set-password", HOSPITALITY_AUTH_RATE_LIMITS.setPassword.max),
	impersonate: scopedAuthLimit("auth:impersonate", HOSPITALITY_AUTH_RATE_LIMITS.impersonate.max),
	accountResendOtp: scopedAuthLimit(
		"account:resend-otp",
		HOSPITALITY_AUTH_RATE_LIMITS.accountResendOtp.max,
	),
	transferVerify: scopedAuthLimit(
		"account:transfer-verify",
		HOSPITALITY_AUTH_RATE_LIMITS.transferVerify.max,
	),
};
