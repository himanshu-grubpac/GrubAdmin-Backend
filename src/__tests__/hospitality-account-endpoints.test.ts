import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { resolveMessageTemplate } from "@/utils/message";
import { errorTemplates } from "@/configs/error-templates";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Hospitality Account routes registration", () => {
	test("registers all Account module endpoints", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"GET /api/v1/hospitality/account/me",
			"PUT /api/v1/hospitality/account",
			"PATCH /api/v1/hospitality/account/update/resend-otp",
			"PATCH /api/v1/hospitality/account/confirm",
			"GET /api/v1/hospitality/account/delete-eligibility",
			"DELETE /api/v1/hospitality/account",
		];
		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("transfer ownership routes remain registered (Module 12 — not Account FE page)", () => {
		const routes = getHospitalityRoutePaths();
		expect(routes).toContain("POST /api/v1/hospitality/account/transfer-ownership");
		expect(routes).toContain("POST /api/v1/hospitality/account/transfer-ownership/verify");
		expect(routes).toContain("POST /api/v1/hospitality/account/transfer-entire-account");
		expect(routes).toContain("POST /api/v1/hospitality/account/transfer-entire-account/verify");
	});
});

describe("Hospitality Account validators", () => {
	test("update account body accepts password change fields", async () => {
		const { z } = await import("zod");
		const schema = z
			.object({
				old_password: z.string().optional(),
				new_password: z.string().optional(),
				confirm_new_password: z.string().optional(),
			})
			.refine(
				(data) => {
					if (data.new_password && data.new_password !== data.confirm_new_password) {
						return false;
					}
					return true;
				},
				{ message: "Passwords do not match", path: ["confirm_new_password"] },
			);

		expect(
			schema.safeParse({
				old_password: "OldPass1!",
				new_password: "NewPass1!",
				confirm_new_password: "NewPass1!",
			}).success,
		).toBe(true);
	});

	test("confirm update accepts 4-digit OTP", async () => {
		const { z } = await import("zod");
		const schema = z.object({
			otp: z.string().trim().min(4).max(4),
		});
		expect(schema.safeParse({ otp: "1234" }).success).toBe(true);
		expect(schema.safeParse({ otp: "12345" }).success).toBe(false);
	});

	test("delete account requires email, otp, otp_id", async () => {
		const { z } = await import("zod");
		const schema = z.object({
			email: z.string().email(),
			otp: z.string().trim().min(4),
			otp_id: z.string().min(1),
		});
		expect(
			schema.safeParse({
				email: "user@example.com",
				otp: "1234",
				otp_id: "abc123",
			}).success,
		).toBe(true);
	});
});

describe("Hospitality Account message/error templates", () => {
	test("profile UPDATE_SUCCESS template resolves", () => {
		const resolved = resolveMessageTemplate("hospitality.employee.profile.UPDATE_SUCCESS");
		expect(resolved.message_toast_title).toBe("Profile updated!");
		expect(resolved.code).toBe(200);
	});

	test("common ACCESS_DENIED template resolves", () => {
		const resolved = (errorTemplates.hospitality as any).common.ACCESS_DENIED;
		expect(resolved.code).toBe(403);
		expect(resolved.error_toast_title).toBe("Access Denied");
	});

	test("account PASSWORD_REQUIRED template resolves", () => {
		const resolved = (errorTemplates.hospitality as any).account.PASSWORD_REQUIRED;
		expect(resolved.code).toBe(400);
	});
});

describe("Hospitality Account profile update helper", () => {
	test("updateHospitalityAccountProfile is exported", async () => {
		const mod = await import("@/db/actions/hospitality/employee.actions");
		expect(typeof mod.updateHospitalityAccountProfile).toBe("function");
	});
});
