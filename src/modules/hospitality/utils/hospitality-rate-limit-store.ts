/**
 * Distributed rate-limit store abstraction for hospitality (Phase 2).
 * In-memory impl today; Redis stub for Phase 4 multi-instance deploy.
 */

export interface RateLimitEntry {
	count: number;
	last: number;
}

export interface RateLimitStore {
	increment(key: string, windowMs: number): Promise<RateLimitEntry>;
	cleanup(windowMs: number): void;
}

/** Process-local store — effective for single instance only (C2 gap until Redis). */
export class InMemoryRateLimitStore implements RateLimitStore {
	private readonly store = new Map<string, RateLimitEntry>();

	async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
		const now = Date.now();
		let entry = this.store.get(key);
		if (!entry || now - entry.last > windowMs) {
			entry = { count: 1, last: now };
		} else {
			entry = { count: entry.count + 1, last: now };
		}
		this.store.set(key, entry);
		return entry;
	}

	cleanup(windowMs: number): void {
		const cutoff = Date.now() - windowMs;
		for (const [key, entry] of this.store) {
			if (entry.last < cutoff) {
				this.store.delete(key);
			}
		}
	}
}

/**
 * Phase 4 stub — wire REDIS_URL + ioredis here for cross-instance limits.
 * Until then, hospitality falls back to InMemoryRateLimitStore.
 */
export class RedisRateLimitStore implements RateLimitStore {
	constructor(_redisUrl?: string) {
		// Phase 4: connect Redis and implement INCR + EXPIRE per key.
	}

	async increment(_key: string, _windowMs: number): Promise<RateLimitEntry> {
		throw new Error(
			"RedisRateLimitStore is not implemented yet — set REDIS_URL in Phase 4 or omit to use in-memory store",
		);
	}

	cleanup(_windowMs: number): void {
		// no-op stub
	}
}

export function createHospitalityRateLimitStore(): RateLimitStore {
	const redisUrl = process.env.REDIS_URL?.trim();
	if (redisUrl) {
		// Phase 4: return new RedisRateLimitStore(redisUrl) once INCR/EXPIRE is implemented.
	}
	return new InMemoryRateLimitStore();
}
