import type { MiddlewareHandler } from "hono";
import {
	createHospitalityRateLimitStore,
	type RateLimitStore,
} from "hospitality/utils/hospitality-rate-limit-store";

const CLEANUP_INTERVAL_MS = 60_000;

let sharedStore: RateLimitStore | null = null;

function getStore(): RateLimitStore {
	if (!sharedStore) {
		sharedStore = createHospitalityRateLimitStore();
	}
	return sharedStore;
}

/** Test hook — inject a mock store without touching shared vertical rate limiters. */
export function setHospitalityRateLimitStoreForTests(store: RateLimitStore | null): void {
	sharedStore = store;
}

export interface HospitalityRateLimitOptions {
	windowMs: number;
	max: number;
	keyGenerator?: (c: any) => string;
}

export function hospitalityRateLimit(options: HospitalityRateLimitOptions): MiddlewareHandler {
	const { windowMs, max, keyGenerator } = options;
	const store = getStore();

	const cleanupTimer = setInterval(() => store.cleanup(windowMs), CLEANUP_INTERVAL_MS);
	if (cleanupTimer.unref) cleanupTimer.unref();

	return async (c, next) => {
		const key = keyGenerator
			? keyGenerator(c)
			: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
				c.req.header("x-real-ip") ||
				"unknown";

		const entry = await store.increment(key, windowMs);
		if (entry.count > max) {
			const retryAfterSec = Math.max(
				1,
				Math.ceil((entry.last + windowMs - Date.now()) / 1000),
			);
			c.header("Retry-After", String(retryAfterSec));
			return c.json(
				{ success: false, message: "Too many requests, please try again later." },
				429,
			);
		}
		await next();
	};
}
