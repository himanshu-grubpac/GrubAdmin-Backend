import type { Context } from "hono";
import { rateLimit } from "@/middlewares/rate-limit";

const clientIp = (c: Context): string =>
	c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
	c.req.header("x-real-ip") ||
	"unknown";

/**
 * Vertical-scoped rate limiters for mobile routers.
 * Keys include the vertical prefix so limits do not bleed across apps sharing the in-memory store.
 */
export function createMobileRateLimits(verticalKey: string) {
	const keyGenerator = (c: Context) => `${verticalKey}:${clientIp(c)}`;

	return {
		/** 120 requests / minute — general API traffic */
		general: rateLimit({ windowMs: 60_000, max: 120, keyGenerator }),
		/** 5 requests / 15 min — auth login & OTP send/verify (matches hospitality/admin) */
		auth: rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyGenerator }),
		/** 10 requests / 15 min — lock OTP, account confirm, transfer verify */
		sensitiveOtp: rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator }),
	};
}
