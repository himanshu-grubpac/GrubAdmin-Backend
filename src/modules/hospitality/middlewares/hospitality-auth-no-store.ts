import { createMiddleware } from "hono/factory";
import { resolveHospitalitySuffix } from "hospitality/middlewares/hospitality-read-cache";

const NO_STORE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const isAuthOrSensitiveAccountPath = (method: string, suffix: string | undefined): boolean => {
	if (!suffix) return false;
	if (suffix === "/auth" || suffix.startsWith("/auth/")) return true;
	if (suffix.startsWith("/account") && NO_STORE_METHODS.has(method)) return true;
	return false;
};

/**
 * Prevent browsers/CDNs from caching auth tokens, OTP session data, or account mutations.
 * Runs after the handler so it overrides hospitality read-cache on sensitive paths.
 */
export const hospitalityAuthNoStoreMiddleware = createMiddleware(async (c, next) => {
	await next();

	const suffix = resolveHospitalitySuffix(c.req.path);
	if (!isAuthOrSensitiveAccountPath(c.req.method, suffix)) return;

	c.header("Cache-Control", "no-store, no-cache, must-revalidate, private");
	c.header("Pragma", "no-cache");
});

export { isAuthOrSensitiveAccountPath };
