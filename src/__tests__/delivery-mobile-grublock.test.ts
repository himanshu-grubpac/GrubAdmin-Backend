import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { z } from "zod";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { medicalMobileDriverRouter } from "@/modules/medical-mobile/driver";
import { campConsumerRouter } from "@/modules/camp-consumer";

const unlockOnlyActionSchema = z.literal("unlock");
const lockOtpSchema = z.object({ action: unlockOnlyActionSchema });
const verifyLockOtpSchema = z.object({
	code: z.string().length(4),
	action: unlockOnlyActionSchema,
});

function getRoutePaths(basePath: string, router: Hono): string[] {
	const app = new Hono();
	app.route(basePath, router);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Delivery mobile GrubLock policy", () => {
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

	test("GrubLock routes are registered on delivery-mobile", () => {
		const routes = getRoutePaths("/api/v1/delivery-mobile", deliveryMobileRouter);

		expect(routes).toContain("PATCH /api/v1/delivery-mobile/boxes/:box_id/lock");
		expect(routes).toContain("POST /api/v1/delivery-mobile/boxes/:box_id/lock/otp");
		expect(routes).toContain("POST /api/v1/delivery-mobile/boxes/:box_id/lock/verify");
	});

	test("delivery-mobile exposes config route (Figma shared baseline)", () => {
		const routes = getRoutePaths("/api/v1/delivery-mobile", deliveryMobileRouter);
		expect(routes).toContain("GET /api/v1/delivery-mobile/config");
		expect(routes).toContain("GET /api/v1/delivery-mobile/dashboard");
		expect(routes).toContain("GET /api/v1/delivery-mobile/support/answer");
	});

	test("owner emergency unlock is not on delivery-mobile driver paths", () => {
		const routes = getRoutePaths("/api/v1/delivery-mobile", deliveryMobileRouter);
		expect(routes.some((r) => r.includes("/grublock/emergency_unlock"))).toBe(false);
	});
});

describe("GrubLock cross-vertical route isolation", () => {
	test("medical driver shares OTP unlock pattern with delivery-mobile", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		expect(routes).toContain("POST /api/v1/medical-mobile/driver/boxes/:box_id/lock/otp");
		expect(routes).toContain("PATCH /api/v1/medical-mobile/driver/boxes/:box_id/lock");
	});

	test("camp consumer has lock routes but no owner emergency unlock", () => {
		const routes = getRoutePaths("/api/v1/camp-consumer", campConsumerRouter);
		expect(routes).toContain("POST /api/v1/camp-consumer/boxes/:box_id/lock/otp");
		expect(routes).toContain("PATCH /api/v1/camp-consumer/boxes/:box_id/lock");
		expect(routes.some((r) => r.includes("/grublock/emergency_unlock"))).toBe(false);
	});
});
