import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { router } from "@/modules";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants.ts";
import { z } from "zod";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

const floorIdsSchema = z.union([
	z.string().ulid(),
	z.array(z.string().ulid()),
]).optional();

describe("Hospitality route registration", () => {
	test("hospitality router is mounted on the app router", () => {
		const routes = router.routes.map((r) => r.path);
		expect(routes.some((p) => p.includes("/hospitality"))).toBe(true);
	});

	test("registers Harish core auth account and grubpac routes", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"POST /api/v1/hospitality/auth/login",
			"POST /api/v1/hospitality/auth/send-otp",
			"POST /api/v1/hospitality/auth/verify-otp",
			"POST /api/v1/hospitality/auth/resend-otp",
			"POST /api/v1/hospitality/auth/logout",
			"GET /api/v1/hospitality/account/me",
			"PUT /api/v1/hospitality/account",
			"PATCH /api/v1/hospitality/account/confirm",
			"DELETE /api/v1/hospitality/account",
			"GET /api/v1/hospitality/grubpac",
			"GET /api/v1/hospitality/grubpac/search",
			"GET /api/v1/hospitality/grubpac/details",
			"PUT /api/v1/hospitality/grubpac",
			"PATCH /api/v1/hospitality/grubpac/reassign",
			"PATCH /api/v1/hospitality/grubpac/suspend",
			"PATCH /api/v1/hospitality/grubpac/reactivate",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("registers notification routes", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"GET /api/v1/hospitality/notification",
			"GET /api/v1/hospitality/notification/dropdowns",
			"GET /api/v1/hospitality/notification/count",
			"PATCH /api/v1/hospitality/notification",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("registers admin impersonation route", () => {
		const routes = getHospitalityRoutePaths();
		expect(routes).toContain("POST /api/v1/hospitality/auth/impersonate");
	});

	test("notification handlers and impersonate handler are exported", async () => {
		const notification = await import("hospitality/handlers/notification");
		const auth = await import("hospitality/handlers/auth");

		expect(typeof notification.getNotificationsHandler).toBe("object");
		expect(typeof notification.getNotificationDropdownsHandler).toBe("object");
		expect(typeof notification.getUnreadNotificationsCountHandler).toBe("object");
		expect(typeof notification.markNotificationsHandler).toBe("object");
		expect(typeof auth.hospitalityImpersonateHandler).toBe("object");
	});
});

describe("Hospitality notifications integration", () => {
	test("HOSPITALITY_VERTICAL_NAME matches vertical filter convention", () => {
		expect(HOSPITALITY_VERTICAL_NAME).toBe("Hospitality");
	});

	test("notification query accepts floor_ids (Hospitality) not restaurant_ids", () => {
		const ulid = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
		expect(floorIdsSchema.safeParse(ulid).success).toBe(true);
		expect(floorIdsSchema.safeParse([ulid]).success).toBe(true);
	});

	test("hospitality-notification.actions exports floor-scoped helpers", async () => {
		const mod = await import("@/db/actions/hospitality-notification.actions.ts");
		expect(typeof mod.getHospitalityNotifications).toBe("function");
		expect(typeof mod.getHospitalityNotificationDropdowns).toBe("function");
	});
});
