import { createMiddleware } from "hono/factory";
import { logHospitalityScoped } from "hospitality/utils/hospitality-logger";
import { recordHospitalityRequestMetrics } from "hospitality/utils/hospitality-metrics-store";

/**
 * Hospitality request completion log + in-process metrics.
 * Runs after auth guards so client_id is available on protected routes.
 * Never logs email, tokens, passwords, or request bodies.
 */
export const hospitalityStructuredLoggingMiddleware = createMiddleware(async (c, next) => {
	const startedAt = Date.now();
	await next();

	const durationMs = Date.now() - startedAt;
	const status = c.res.status;
	const requestId = c.get("hospitalityRequestId");
	const clientId = c.var.client_id as string | undefined;

	recordHospitalityRequestMetrics(status, durationMs);

	logHospitalityScoped(
		"info",
		"hospitality_request",
		{
			request_id: requestId,
			client_id: clientId,
			route: c.req.path,
		},
		{
			method: c.req.method,
			status,
			duration_ms: durationMs,
		},
	);
});
