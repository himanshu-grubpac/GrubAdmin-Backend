import type { Context } from "hono";
import { rateLimit } from "@/middlewares/rate-limit";
import {
	DELIVERY_AUTH_RATE_MAX,
	DELIVERY_AUTH_RATE_WINDOW_MS,
	DELIVERY_GENERAL_RATE_MAX,
	DELIVERY_GENERAL_RATE_WINDOW_MS,
} from "delivery/configs/delivery-rate-limits";

const VERTICAL_KEY = "delivery";

const clientIp = (c: Context): string =>
	c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
	c.req.header("x-real-ip") ||
	"unknown";

/**
 * Delivery-portal rate limiters. Keys include the vertical prefix so limits
 * do not bleed across apps sharing the in-memory store.
 */
export function createDeliveryRateLimits() {
	const keyGenerator = (c: Context) => `${VERTICAL_KEY}:${clientIp(c)}`;

	return {
		/** 120 requests / minute — general API traffic */
		general: rateLimit({
			windowMs: DELIVERY_GENERAL_RATE_WINDOW_MS,
			max: DELIVERY_GENERAL_RATE_MAX,
			keyGenerator,
		}),
		/** 5 requests / 15 min — auth login, OTP, password reset */
		auth: rateLimit({
			windowMs: DELIVERY_AUTH_RATE_WINDOW_MS,
			max: DELIVERY_AUTH_RATE_MAX,
			keyGenerator,
		}),
	};
}
