import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import {
	CACHE_MAX_AGE_SECONDS,
	ETAG_PATHS,
	resolveHospitalitySuffix,
} from "@/modules/hospitality/middlewares/hospitality-read-cache";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Hospitality read-cache middleware", () => {
	test("resolveHospitalitySuffix strips prefix and query", () => {
		expect(resolveHospitalitySuffix("/api/v1/hospitality/account/me")).toBe("/account/me");
		expect(resolveHospitalitySuffix("/api/v1/hospitality/grubpac?limit=1")).toBe("/grubpac");
		expect(resolveHospitalitySuffix("/api/v1/hospitality/floor")).toBe("/floor");
	});

	test("CACHE_MAX_AGE_SECONDS covers hot read GET paths", () => {
		expect(CACHE_MAX_AGE_SECONDS["/account/me"]).toBe(30);
		expect(CACHE_MAX_AGE_SECONDS["/grubpac"]).toBe(15);
		expect(CACHE_MAX_AGE_SECONDS["/floor"]).toBe(15);
		expect(CACHE_MAX_AGE_SECONDS["/notification"]).toBe(15);
		expect(CACHE_MAX_AGE_SECONDS["/notification/count"]).toBe(15);
		expect(CACHE_MAX_AGE_SECONDS["/grubpac/dropdowns"]).toBe(120);
	});

	test("ETAG_PATHS includes list endpoints", () => {
		expect(ETAG_PATHS.has("/grubpac")).toBe(true);
		expect(ETAG_PATHS.has("/notification")).toBe(true);
	});

	test("hospitality router registers cache-eligible routes", () => {
		const routes = getHospitalityRoutePaths();
		for (const route of [
			"GET /api/v1/hospitality/account/me",
			"GET /api/v1/hospitality/grubpac",
			"GET /api/v1/hospitality/floor",
			"GET /api/v1/hospitality/notification",
			"GET /api/v1/hospitality/notification/count",
		]) {
			expect(routes).toContain(route);
		}
	});
});

describe("Hospitality transfer-all verify (C7)", () => {
	test("verify handler module exports without loading all box ids helper", async () => {
		const mod = await import(
			"@/modules/hospitality/handlers/account/verify-transfer-ownership.handler.ts"
		);
		expect(typeof mod.verifyTransferOwnershipHandler).toBe("object");
		expect(typeof mod.verifyTransferEntireAccountHandler).toBe("object");
	});
});
