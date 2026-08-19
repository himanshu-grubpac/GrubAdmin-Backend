import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { medicalRouter } from "@/modules/medical";
import { categoriesEnum } from "medical/validators/log.validators.ts";

function getMedicalRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/medical", medicalRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Medical route registration", () => {
	test("does not register admin-only grubpac create or delete routes", () => {
		const routes = getMedicalRoutePaths();
		expect(routes).not.toContain("POST /api/v1/medical/grubpac");
		expect(routes).not.toContain("DELETE /api/v1/medical/grubpac");
		expect(routes).toContain("PUT /api/v1/medical/grubpac");
	});

	test("registers phase 6 department grubpac and auth routes", () => {
		const routes = getMedicalRoutePaths();
		const expected = [
			"GET /api/v1/medical/department/delete-summary",
			"GET /api/v1/medical/department/reassignment-candidates",
			"POST /api/v1/medical/department/reassign/validate",
			"GET /api/v1/medical/grubpac/dropdowns",
			"GET /api/v1/medical/auth/verify-authenticated",
			"POST /api/v1/medical/auth/reset-password/otp/send",
			"POST /api/v1/medical/auth/reset-password/otp/resend",
			"POST /api/v1/medical/auth/reset-password/confirm",
		];
		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("registers account routes including transfer-entire-account", () => {
		const routes = getMedicalRoutePaths();
		const expected = [
			"GET /api/v1/medical/account/me",
			"PUT /api/v1/medical/account",
			"PATCH /api/v1/medical/account/update/resend-otp",
			"PATCH /api/v1/medical/account/confirm",
			"POST /api/v1/medical/account/transfer-ownership",
			"POST /api/v1/medical/account/transfer-ownership/verify",
			"POST /api/v1/medical/account/transfer-entire-account",
			"POST /api/v1/medical/account/transfer-entire-account/verify",
			"GET /api/v1/medical/account/mygrubpacs",
			"DELETE /api/v1/medical/account",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("registers dashboard route", () => {
		const routes = getMedicalRoutePaths();
		expect(routes).toContain("GET /api/v1/medical/dashboard");
	});

	test("registers grublock routes", () => {
		const routes = getMedicalRoutePaths();
		const expected = [
			"GET /api/v1/medical/grublock",
			"GET /api/v1/medical/grublock/search",
			"GET /api/v1/medical/grublock/details",
			"PATCH /api/v1/medical/grublock/lock",
			"PATCH /api/v1/medical/grublock/unlock",
			"PATCH /api/v1/medical/grublock/unlock/verify",
			"PATCH /api/v1/medical/grublock/emergency_unlock",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("registers logs routes with department (not restaurant)", () => {
		const routes = getMedicalRoutePaths();
		const expected = [
			"GET /api/v1/medical/logs/dropdowns",
			"POST /api/v1/medical/logs",
			"POST /api/v1/medical/department/logs",
			"GET /api/v1/medical/department/logs/dropdowns",
			"POST /api/v1/medical/employee/logs",
			"GET /api/v1/medical/employee/logs/dropdowns",
			"POST /api/v1/medical/grubpac/logs",
			"GET /api/v1/medical/grubpac/logs/dropdowns",
			"POST /api/v1/medical/grublock/logs",
			"GET /api/v1/medical/grublock/logs/dropdowns",
		];

		for (const route of expected) {
			expect(routes).toContain(route);
		}

		expect(routes.some((r) => r.includes("/restaurant/logs"))).toBe(false);
	});

	test("log validators use Department category for Medical", () => {
		expect(categoriesEnum).toContain("Department");
		expect(categoriesEnum).not.toContain("Restaurant");
	});

	test("account and transfer-ownership OTP action modules are exported", async () => {
		const updateOtp = await import("@/db/actions/medical-employee-update-otp.actions.ts");
		const transferOtp = await import("@/db/actions/medical-transfer-ownership-otp.actions.ts");

		expect(typeof updateOtp.getMedicalEmployeeUpdateOtp).toBe("function");
		expect(typeof transferOtp.createMedicalTransferOwnershipOtp).toBe("function");
	});
});
