import { createMiddleware } from "hono/factory";
import { randomUUID } from "crypto";

declare module "hono" {
	interface ContextVariableMap {
		hospitalityRequestId: string;
	}
}

/**
 * Hospitality request tracing — honors inbound x-request-id, echoes on response.
 * Completion logging + metrics are handled by hospitalityStructuredLoggingMiddleware.
 */
export const hospitalityRequestIdMiddleware = createMiddleware(async (c, next) => {
	const incoming = c.req.header("x-request-id")?.trim();
	const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();

	c.set("hospitalityRequestId", requestId);
	(c as { requestId?: string }).requestId = requestId;
	c.header("X-Request-Id", requestId);

	await next();
});
