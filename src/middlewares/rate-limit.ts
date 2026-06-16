import type { MiddlewareHandler } from "hono";


const rateLimitStore = new Map<string, { count: number; last: number }>();

const CLEANUP_INTERVAL_MS = 60_000;

const cleanupExpired = (windowMs: number) => {
  const cutoff = Date.now() - windowMs;
  for (const [key, entry] of rateLimitStore) {
    if (entry.last < cutoff) {
      rateLimitStore.delete(key);
    }
  }
};

export interface RateLimitOptions {
  windowMs: number; 
  max: number; 
  keyGenerator?: (c: any) => string;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, max, keyGenerator } = options;

  // Periodically purge expired entries to prevent memory leak
  const cleanupTimer = setInterval(() => cleanupExpired(windowMs), CLEANUP_INTERVAL_MS);
  if (cleanupTimer.unref) cleanupTimer.unref();

  return async (c, next) => {
		// Use the real client IP as the rate limit key.
		// x-forwarded-for may contain a chain of IPs — take only the first (original client).
		// Never fall back to User-Agent — it is trivially spoofed.
		const key = keyGenerator
			? keyGenerator(c)
			: (
					c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
					c.req.header("x-real-ip") ||
					"unknown"
			  );
    const now = Date.now();
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.last > windowMs) {
      entry = { count: 1, last: now };
    } else {
      entry.count++;
    }
    rateLimitStore.set(key, entry);
    if (entry.count > max) {
      return c.json({ success: false, message: `Too many requests, please try again later.` }, 429);
    }
    await next();
  };
}
