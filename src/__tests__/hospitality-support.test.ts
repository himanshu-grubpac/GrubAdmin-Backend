import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants.ts";

describe("Hospitality Support integration", () => {
	test("HOSPITALITY_VERTICAL_NAME matches FAQ vertical filter convention", () => {
		expect(HOSPITALITY_VERTICAL_NAME).toBe("Hospitality");
	});

	test("hospitality router registers support routes", () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const routes = app.routes.map((r) => `${r.method} ${r.path}`);
		const expected = [
			"GET /api/v1/hospitality/support/category",
			"GET /api/v1/hospitality/support/faq",
			"GET /api/v1/hospitality/support/search",
			"GET /api/v1/hospitality/support/answer",
			"GET /api/v1/hospitality/support/faq/attachment/download",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});
});
