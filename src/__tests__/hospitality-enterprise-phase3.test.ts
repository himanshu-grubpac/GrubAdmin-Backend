import { describe, expect, test, beforeEach } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import {
	clearHospitalityMetricsForTests,
	getHospitalityMetricsSnapshot,
	recordHospitalityRequestMetrics,
} from "@/modules/hospitality/utils/hospitality-metrics-store";
describe("Hospitality Phase 3 — request ID middleware", () => {
	test("honors inbound x-request-id and echoes X-Request-Id", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-request-id": "trace-phase3-01",
			},
			body: JSON.stringify({ email: "missing@example.com", password: "secret123" }),
		});

		expect(res.headers.get("X-Request-Id")).toBe("trace-phase3-01");
	});

	test("generates UUID when x-request-id is absent", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "missing@example.com", password: "secret123" }),
		});

		const requestId = res.headers.get("X-Request-Id");
		expect(requestId).toBeTruthy();
		expect(requestId!.length).toBeGreaterThan(10);
	});
});

describe("Hospitality Phase 3 — structured logging helper", () => {
	test("logHospitalityScoped module exports structured helpers", async () => {
		const mod = await import("@/modules/hospitality/utils/hospitality-logger.ts");
		expect(typeof mod.logHospitalityScoped).toBe("function");
		expect(typeof mod.getHospitalityLogScope).toBe("function");
	});
});

describe("Hospitality Phase 3 — in-process metrics store", () => {
	beforeEach(() => {
		clearHospitalityMetricsForTests();
	});

	test("records request counts and status class buckets", () => {
		recordHospitalityRequestMetrics(200, 50);
		recordHospitalityRequestMetrics(404, 30);
		recordHospitalityRequestMetrics(500, 120);

		const snap = getHospitalityMetricsSnapshot();
		expect(snap.request_count).toBe(3);
		expect(snap.status_4xx_count).toBe(1);
		expect(snap.status_5xx_count).toBe(1);
		expect(snap.latency_ms.sample_size).toBe(3);
	});

	test("computes approximate p95 latency from samples", () => {
		for (let i = 1; i <= 100; i += 1) {
			recordHospitalityRequestMetrics(200, i);
		}
		const snap = getHospitalityMetricsSnapshot();
		expect(snap.latency_ms.p95).toBeGreaterThanOrEqual(95);
		expect(snap.latency_ms.p95).toBeLessThanOrEqual(100);
	});
});

describe("Hospitality Phase 3 — metrics endpoint", () => {
	beforeEach(() => {
		clearHospitalityMetricsForTests();
	});

	test("GET /metrics requires auth when HOSPITALITY_METRICS_KEY is unset", async () => {
		const prior = process.env.HOSPITALITY_METRICS_KEY;
		delete process.env.HOSPITALITY_METRICS_KEY;

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/metrics");
		expect(res.status).toBe(401);

		if (prior !== undefined) process.env.HOSPITALITY_METRICS_KEY = prior;
	});

	test("GET /metrics accepts internal key when HOSPITALITY_METRICS_KEY is set", async () => {
		process.env.HOSPITALITY_METRICS_KEY = "test-internal-metrics-key";

		recordHospitalityRequestMetrics(200, 42);

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/metrics", {
			headers: { "x-hospitality-internal-key": "test-internal-metrics-key" },
		});

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			success: boolean;
			data: { request_count: number; uptime_seconds: number };
		};
		expect(body.success).toBe(true);
		expect(body.data.request_count).toBeGreaterThanOrEqual(1);
		expect(typeof body.data.uptime_seconds).toBe("number");

		delete process.env.HOSPITALITY_METRICS_KEY;
	});

	test("structured logging middleware records hospitality requests in metrics store", async () => {
		clearHospitalityMetricsForTests();

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "missing@example.com", password: "secret123" }),
		});

		const snap = getHospitalityMetricsSnapshot();
		expect(snap.request_count).toBeGreaterThanOrEqual(1);
		expect(snap.latency_ms.sample_size).toBeGreaterThanOrEqual(1);
	});
});

describe("Hospitality Phase 3 — middleware modules exist", () => {
	test("structured logging middleware is exported", async () => {
		const mod = await import("@/modules/hospitality/middlewares/hospitality-structured-logging.ts");
		expect(typeof mod.hospitalityStructuredLoggingMiddleware).toBe("function");
	});

	test("hospitality logger utility is exported", async () => {
		const mod = await import("@/modules/hospitality/utils/hospitality-logger.ts");
		expect(typeof mod.logHospitality).toBe("function");
		expect(typeof mod.logHospitalityScoped).toBe("function");
	});
});
