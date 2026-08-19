import type { Context } from "hono";
import {
	GENERIC_SERVER_ERROR_MESSAGE,
	globalErrorHandler,
} from "@/middlewares/error";

const INTERNAL_RESPONSE_KEYS = new Set([
	"prisma_code",
	"prisma_meta",
	"root_cause",
	"stack",
]);

const GENERIC_SERVER_ERROR = GENERIC_SERVER_ERROR_MESSAGE;

/**
 * Hospitality wrapper: delegate to shared handler, then strip internal diagnostics
 * from 5xx client payloads (details remain in server logs via globalErrorHandler).
 *
 * Ops note (P3-05): pool exhaustion returns generic 503 JSON with no root_cause here.
 * Correlate via PM2 logs ("MySQL pool/connection error") + X-Request-Id + /hospitality/metrics 5xx.
 */
export const hospitalityErrorHandler = async (error: unknown, ctx: Context): Promise<Response> => {
	const res = await globalErrorHandler(error, ctx);
	if (!res || res.status < 500) return res ?? ctx.json({ success: false, error: GENERIC_SERVER_ERROR, code: 500 }, 500);

	let body: Record<string, unknown>;
	try {
		body = (await res.clone().json()) as Record<string, unknown>;
	} catch {
		return res;
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(body)) {
		if (!INTERNAL_RESPONSE_KEYS.has(key)) {
			sanitized[key] = value;
		}
	}

	sanitized.error = GENERIC_SERVER_ERROR;
	sanitized.code = typeof sanitized.code === "number" ? sanitized.code : res.status;

	return new Response(JSON.stringify(sanitized), {
		status: res.status,
		headers: {
			"Content-Type": "application/json",
		},
	});
};
