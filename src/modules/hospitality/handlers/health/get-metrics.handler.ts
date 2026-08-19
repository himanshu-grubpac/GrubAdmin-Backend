import { createHandlers } from "@/utils/hono-factory.ts";
import { createMiddleware } from "hono/factory";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getHospitalityMetricsSnapshot } from "hospitality/utils/hospitality-metrics-store";

const readHospitalityMetricsKey = (): string | undefined =>
	process.env.HOSPITALITY_METRICS_KEY?.trim();

/**
 * Allows admin session OR optional internal scrape key (HOSPITALITY_METRICS_KEY env).
 * When env is unset, admin auth is required.
 */
const hospitalityMetricsAccessGuard = createMiddleware(async (c, next) => {
	const metricsKey = readHospitalityMetricsKey();
	if (metricsKey) {
		const internalKey = c.req.header("x-hospitality-internal-key")?.trim();
		if (internalKey && internalKey === metricsKey) {
			await next();
			return;
		}
	}

	return hospitalityAuthGuard(["admin"])(c, next);
});

export const getHospitalityMetricsHandler = createHandlers(
	hospitalityMetricsAccessGuard,
	async (context) => {
		return context.json<APIResponse<ReturnType<typeof getHospitalityMetricsSnapshot>>>(
			{
				success: true,
				code: 200,
				data: getHospitalityMetricsSnapshot(),
			},
			{ status: 200 },
		);
	},
);
