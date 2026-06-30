import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Hospitality Floor routes registration", () => {
	test("registers all required Floor endpoints", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"POST /api/v1/hospitality/floor",
			"GET /api/v1/hospitality/floor",
			"GET /api/v1/hospitality/floor/details",
			"PUT /api/v1/hospitality/floor",
			"DELETE /api/v1/hospitality/floor",
			"PATCH /api/v1/hospitality/floor/suspend",
			"PATCH /api/v1/hospitality/floor/reactivate",
			"GET /api/v1/hospitality/floor/search",
		];
		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});
});
