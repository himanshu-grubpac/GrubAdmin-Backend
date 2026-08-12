import { describe, expect, test } from "bun:test";
import { z } from "zod";

const unlockOnlyActionSchema = z.literal("unlock");
const lockOtpSchema = z.object({ action: unlockOnlyActionSchema });
const verifyLockOtpSchema = z.object({
	code: z.string().length(4),
	action: unlockOnlyActionSchema,
});

describe("Medical mobile driver GrubLock policy", () => {
	test("lock OTP request accepts unlock only", () => {
		expect(lockOtpSchema.safeParse({ action: "unlock" }).success).toBe(true);
		expect(lockOtpSchema.safeParse({ action: "lock" }).success).toBe(false);
	});

	test("lock OTP verify accepts unlock only", () => {
		expect(verifyLockOtpSchema.safeParse({ code: "1234", action: "unlock" }).success).toBe(
			true,
		);
		expect(verifyLockOtpSchema.safeParse({ code: "1234", action: "lock" }).success).toBe(
			false,
		);
	});

	test("PATCH /boxes/:box_id/lock route is registered (no OTP for lock)", async () => {
		const { medicalMobileDriverRouter } = await import("@/modules/medical-mobile/driver");
		const { Hono } = await import("hono");
		const app = new Hono();
		app.route("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		const routes = app.routes.map((r) => `${r.method} ${r.path}`);

		expect(routes).toContain("PATCH /api/v1/medical-mobile/driver/boxes/:box_id/lock");
		expect(routes).toContain("POST /api/v1/medical-mobile/driver/boxes/:box_id/lock/otp");
		expect(routes).toContain("POST /api/v1/medical-mobile/driver/boxes/:box_id/lock/verify");
	});

	test("verifyHandlerLockOtp rejects lock action at action layer", async () => {
		const { verifyHandlerLockOtp } = await import("@/db/actions/medical-mobile/box.actions.ts");

		await expect(
			verifyHandlerLockOtp({
				box_id: "box-1",
				client_id: "client-1",
				employee_id: "handler-1",
				employee_email: "h@test.com",
				employee_name: "Handler",
				code: "1234",
				action: "lock",
			}),
		).rejects.toMatchObject({ code: 400 });
	});
});
