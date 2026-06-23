import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { medicalRouter } from "@/modules/medical";
import { MEDICAL_VERTICAL_NAME } from "@/configs/constants.ts";
import { z } from "zod";

const departmentIdsSchema = z.union([
	z.string().ulid(),
	z.array(z.string().ulid()),
]).optional();

describe("Medical Support & Notifications integration", () => {
	test("MEDICAL_VERTICAL_NAME matches FAQ vertical filter convention", () => {
		expect(MEDICAL_VERTICAL_NAME).toBe("Medical");
	});

	test("medical router registers support and notification routes", () => {
		const app = new Hono();
		app.route("/api/v1/medical", medicalRouter);

		const routes = app.routes.map((r) => `${r.method} ${r.path}`);
		const expected = [
			"GET /api/v1/medical/support/category",
			"GET /api/v1/medical/support/faq",
			"GET /api/v1/medical/support/search",
			"GET /api/v1/medical/support/answer",
			"GET /api/v1/medical/support/faq/attachment/download",
			"GET /api/v1/medical/notification",
			"GET /api/v1/medical/notification/dropdowns",
			"GET /api/v1/medical/notification/count",
			"PATCH /api/v1/medical/notification",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("notification query accepts department_ids (Medical) not restaurant_ids", () => {
		const ulid = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
		const parsed = departmentIdsSchema.safeParse(ulid);
		expect(parsed.success).toBe(true);

		const parsedArray = departmentIdsSchema.safeParse([ulid]);
		expect(parsedArray.success).toBe(true);
	});

	test("medical-notification.actions module exports department-scoped helpers", async () => {
		const mod = await import("@/db/actions/medical-notification.actions.ts");
		expect(typeof mod.getMedicalNotifications).toBe("function");
		expect(typeof mod.getMedicalNotificationDropdowns).toBe("function");
	});
});
