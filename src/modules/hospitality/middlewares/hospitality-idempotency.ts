import { createMiddleware } from "hono/factory";

/** Default replay window for duplicate Idempotency-Key submissions. */
export const HOSPITALITY_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

interface IdempotencyRecord {
	statusCode: number;
	body: unknown;
	expiresAt: number;
}

/**
 * In-process idempotency cache (H4). Replace with Redis in Phase 4 for multi-instance.
 * Keys: method + path + Idempotency-Key header.
 */
const idempotencyStore = new Map<string, IdempotencyRecord>();

const cleanupExpired = () => {
	const now = Date.now();
	for (const [key, record] of idempotencyStore) {
		if (record.expiresAt <= now) {
			idempotencyStore.delete(key);
		}
	}
};

const cleanupTimer = setInterval(cleanupExpired, 60_000);
if (cleanupTimer.unref) cleanupTimer.unref();

export function buildIdempotencyScopeKey(method: string, path: string, idempotencyKey: string): string {
	return `${method}:${path}:${idempotencyKey}`;
}

/** Test hook — clear or inspect store without cross-test leakage. */
export function clearHospitalityIdempotencyStoreForTests(): void {
	idempotencyStore.clear();
}

export function getHospitalityIdempotencyRecordForTests(
	scopeKey: string,
): IdempotencyRecord | undefined {
	return idempotencyStore.get(scopeKey);
}

export const hospitalityIdempotencyMiddleware = createMiddleware(async (c, next) => {
	const idempotencyKey = c.req.header("Idempotency-Key")?.trim();
	if (!idempotencyKey) {
		await next();
		return;
	}

	const scopeKey = buildIdempotencyScopeKey(c.req.method, c.req.path, idempotencyKey);
	const existing = idempotencyStore.get(scopeKey);
	if (existing && existing.expiresAt > Date.now()) {
		c.header("Idempotency-Replayed", "true");
		return c.json(existing.body, existing.statusCode as any);
	}

	await next();

	if (c.res.status < 200 || c.res.status >= 300) {
		return;
	}

	try {
		const cloned = c.res.clone();
		const body = await cloned.json();
		idempotencyStore.set(scopeKey, {
			statusCode: c.res.status,
			body,
			expiresAt: Date.now() + HOSPITALITY_IDEMPOTENCY_TTL_MS,
		});
	} catch {
		// Non-JSON success responses are not cached.
	}
});
