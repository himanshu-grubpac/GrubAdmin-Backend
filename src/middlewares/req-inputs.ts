import { NODE_ENV } from "@/configs/env.ts";
import { createMiddleware } from "@/utils/hono-factory.ts";

/**
 * Fields that must NEVER appear in req_inputs debug output.
 * Prevents plaintext passwords / tokens leaking into API responses.
 */
const SENSITIVE_KEYS = new Set([
	"password",
	"otp",
	"token",
	"secret",
	"auth_token",
	"new_password",
	"confirm_password",
	"current_password",
]);

function sanitizeInputs(inputs: Record<string, any>): Record<string, any> {
	return Object.fromEntries(
		Object.entries(inputs).filter(([key]) => !SENSITIVE_KEYS.has(key.toLowerCase())),
	);
}

/**
 * Middleware that automatically injects `req_inputs` into every JSON response.
 *
 * It collects all validated query params and JSON body fields (after validators
 * have run via await next()), then merges them into the response JSON body
 * under the key `req_inputs`.
 *
 * Sensitive fields (password, otp, token, etc.) are stripped before injection.
 * This runs globally on the delivery router so no individual handler needs to be
 * modified.
 */
export const reqInputsMiddleware = createMiddleware(async (c, next) => {
    await next();

    // Skip in production
    if (NODE_ENV === "production") return;

    // Only process JSON responses
    const contentType = c.res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return;

    // Collect validated query params (set by query validators before the handler)
    const inputs: Record<string, any> = {};

    try {
        const query = (c.req as any).valid("query");
        if (query && typeof query === "object") {
            Object.assign(inputs, query);
        }
    } catch {
        // no query validator on this route
    }

    try {
        const body = (c.req as any).valid("json");
        if (body && typeof body === "object") {
            Object.assign(inputs, body);
        }
    } catch {
        // no json body validator on this route
    }

    // Nothing to inject — skip
    if (Object.keys(inputs).length === 0) return;

    // Clone response body and inject req_inputs
    let json: any;
    try {
        json = await c.res.json();
    } catch {
        return; // not valid JSON, leave as-is
    }

    const modifiedBody = JSON.stringify({ ...json, req_inputs: sanitizeInputs(inputs) });

    // Rebuild response preserving status and headers
    const newHeaders = new Headers(c.res.headers);
    newHeaders.set("content-length", String(new TextEncoder().encode(modifiedBody).length));

    c.res = new Response(modifiedBody, {
        status: c.res.status,
        headers: newHeaders,
    });
});
