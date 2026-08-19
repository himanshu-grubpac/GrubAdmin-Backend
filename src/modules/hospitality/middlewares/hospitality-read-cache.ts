import { createHash } from "crypto";
import { createMiddleware } from "hono/factory";

const CACHE_MAX_AGE_SECONDS: Record<string, number> = {
	"/account/me": 30,
	"/grubpac": 15,
	"/floor": 15,
	"/notification": 15,
	"/notification/dropdowns": 120,
	"/grubpac/dropdowns": 120,
	"/grubpac/logs/dropdowns": 120,
	"/notification/count": 15,
	"/support/category": 300,
};

/** GET list paths eligible for weak ETag + If-None-Match (304). */
const ETAG_PATHS = new Set([
	"/grubpac",
	"/floor",
	"/notification",
	"/notification/count",
]);

const ETAG_CACHE_TTL_MS = 60_000;

interface EtagCacheEntry {
	etag: string;
	expiresAt: number;
}

/** In-process ETag cache until Redis (Phase 4). Keyed by auth + path + query. */
const etagCache = new Map<string, EtagCacheEntry>();

const resolveHospitalitySuffix = (path: string): string | undefined => {
	const marker = "/hospitality";
	const idx = path.indexOf(marker);
	const suffix = idx >= 0 ? path.slice(idx + marker.length) : path;
	return suffix.split("?")[0] || undefined;
};

const buildEtagCacheKey = (c: { req: { header: (name: string) => string | undefined; path: string; url: string } }): string => {
	const auth = c.req.header("Authorization") || "anon";
	const query = c.req.url.includes("?") ? c.req.url.split("?")[1] : "";
	return `${auth}:${c.req.path}:${query}`;
};

export const computeWeakEtag = (body: unknown): string => {
	const hash = createHash("sha256")
		.update(JSON.stringify(body))
		.digest("base64url");
	return `W/"${hash.slice(0, 27)}"`;
};

/** Test hook — reset ETag cache between tests. */
export function clearHospitalityEtagCacheForTests(): void {
	etagCache.clear();
}

export const hospitalityReadCacheMiddleware = createMiddleware(async (c, next) => {
	const suffix = resolveHospitalitySuffix(c.req.path);
	const isGet = c.req.method === "GET";
	const maxAge = suffix ? CACHE_MAX_AGE_SECONDS[suffix] : undefined;
	const etagEligible = isGet && suffix != null && ETAG_PATHS.has(suffix);

	if (etagEligible) {
		const cacheKey = buildEtagCacheKey(c);
		const ifNoneMatch = c.req.header("If-None-Match");
		const cached = etagCache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now() && ifNoneMatch === cached.etag) {
			c.header("ETag", cached.etag);
			if (maxAge != null) {
				c.header("Cache-Control", `private, max-age=${maxAge}`);
			}
			return c.body(null, 304);
		}
	}

	await next();

	if (!isGet || c.res.status < 200 || c.res.status >= 300 || !suffix) {
		return;
	}

	if (maxAge != null) {
		c.header("Cache-Control", `private, max-age=${maxAge}`);
	}

	if (!etagEligible) {
		return;
	}

	try {
		const cloned = c.res.clone();
		const body = await cloned.json();
		const etag = computeWeakEtag(body);
		const cacheKey = buildEtagCacheKey(c);
		const ttlMs = (maxAge ?? 15) * 1000;
		etagCache.set(cacheKey, {
			etag,
			expiresAt: Date.now() + Math.min(ttlMs, ETAG_CACHE_TTL_MS),
		});
		c.header("ETag", etag);
	} catch {
		// Skip ETag for non-JSON GET responses.
	}
});

export { CACHE_MAX_AGE_SECONDS, resolveHospitalitySuffix, ETAG_PATHS };
