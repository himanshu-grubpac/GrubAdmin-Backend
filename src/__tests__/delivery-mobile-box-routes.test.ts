import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";

function getDeliveryMobileRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/delivery-mobile", deliveryMobileRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Delivery-mobile box route registration", () => {
	test("registers all 9 Section 3 box management routes", () => {
		const routes = getDeliveryMobileRoutePaths();
		const expected = [
			"GET /api/v1/delivery-mobile/boxes",
			"POST /api/v1/delivery-mobile/boxes",
			"GET /api/v1/delivery-mobile/boxes/:box_id",
			"DELETE /api/v1/delivery-mobile/boxes/:box_id",
			"PATCH /api/v1/delivery-mobile/boxes/:box_id/settings",
			"POST /api/v1/delivery-mobile/boxes/:box_id/connection",
			"DELETE /api/v1/delivery-mobile/boxes/:box_id/connection",
			"POST /api/v1/delivery-mobile/boxes/:box_id/lock/otp",
			"POST /api/v1/delivery-mobile/boxes/:box_id/lock/verify",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});
});
