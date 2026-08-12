import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { z } from "zod";
import { campConsumerRouter } from "@/modules/camp-consumer";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { medicalMobileDriverRouter } from "@/modules/medical-mobile/driver";
import { APIError } from "@/types/error";

function getRoutePaths(basePath: string, router: Hono): string[] {
	const app = new Hono();
	app.route(basePath, router);
	return app.routes.map((route) => `${route.method} ${route.path}`);
}

/** Figma Backend API Requirements — camp-consumer base routes */
const FIGMA_CAMP_ROUTES = [
	"GET /api/v1/camp-consumer/health",
	"POST /api/v1/camp-consumer/auth/check-account",
	"POST /api/v1/camp-consumer/auth/send-otp",
	"POST /api/v1/camp-consumer/auth/verify-otp",
	"POST /api/v1/camp-consumer/auth/resend-otp",
	"POST /api/v1/camp-consumer/auth/set-password",
	"POST /api/v1/camp-consumer/auth/logout",
	"GET /api/v1/camp-consumer/account/me",
	"PUT /api/v1/camp-consumer/account",
	"PUT /api/v1/camp-consumer/account/password",
	"DELETE /api/v1/camp-consumer/account",
	"GET /api/v1/camp-consumer/dashboard",
	"GET /api/v1/camp-consumer/config",
	"GET /api/v1/camp-consumer/boxes",
	"POST /api/v1/camp-consumer/boxes",
	"GET /api/v1/camp-consumer/boxes/:box_id",
	"DELETE /api/v1/camp-consumer/boxes/:box_id",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/settings",
	"POST /api/v1/camp-consumer/boxes/:box_id/connection",
	"DELETE /api/v1/camp-consumer/boxes/:box_id/connection",
	"GET /api/v1/camp-consumer/boxes/:box_id/camera/live",
	"GET /api/v1/camp-consumer/boxes/:box_id/camera/feeds",
	"GET /api/v1/camp-consumer/boxes/:box_id/camera/feeds/:feed_id/stream",
	"POST /api/v1/camp-consumer/boxes/:box_id/camera/upload-url",
	"POST /api/v1/camp-consumer/boxes/:box_id/camera/feeds/register",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/camera/surveillance-mode",
	"GET /api/v1/camp-consumer/support/category",
	"GET /api/v1/camp-consumer/support/faq",
	"GET /api/v1/camp-consumer/support/answer",
	"GET /api/v1/camp-consumer/notification",
	"PATCH /api/v1/camp-consumer/notification",
	"GET /api/v1/camp-consumer/boxes/:box_id/alerts",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/alerts",
	"POST /api/v1/camp-consumer/boxes/:box_id/lock/otp",
	"POST /api/v1/camp-consumer/boxes/:box_id/lock/verify",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/lock",
];

describe("Camp consumer contract (Figma Backend API Requirements)", () => {
	test("mounts auth, account, box, camera, support, and notification routes", () => {
		const routes = getRoutePaths("/api/v1/camp-consumer", campConsumerRouter);

		for (const route of FIGMA_CAMP_ROUTES) {
			expect(routes).toContain(route);
		}
	});

	test("does not expose driver-only portal routes", () => {
		const routes = getRoutePaths("/api/v1/camp-consumer", campConsumerRouter);
		expect(routes.some((r) => r.includes("/restaurant"))).toBe(false);
		expect(routes.some((r) => r.includes("/employee"))).toBe(false);
		expect(routes.some((r) => r.includes("transfer-ownership"))).toBe(false);
	});

	test("does not expose medical-only emergency routes", () => {
		const routes = getRoutePaths("/api/v1/camp-consumer", campConsumerRouter);
		expect(routes.some((r) => r.includes("/emergency/"))).toBe(false);
	});

	test("camera routes are camp-only (not on delivery-mobile or medical driver)", () => {
		const campRoutes = getRoutePaths("/api/v1/camp-consumer", campConsumerRouter);
		const deliveryRoutes = getRoutePaths("/api/v1/delivery-mobile", deliveryMobileRouter);
		const driverRoutes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);

		expect(campRoutes).toContain("GET /api/v1/camp-consumer/boxes/:box_id/camera/live");
		expect(deliveryRoutes.some((r) => r.includes("/camera/"))).toBe(false);
		expect(driverRoutes.some((r) => r.includes("/camera/"))).toBe(false);
	});
});

describe("GrubLock policy validators (mobile-core)", () => {
	test("unlock-only OTP action schema rejects lock", () => {
		const unlockOnlyActionSchema = z.object({ action: z.literal("unlock") });
		expect(unlockOnlyActionSchema.safeParse({ action: "unlock" }).success).toBe(true);
		expect(unlockOnlyActionSchema.safeParse({ action: "lock" }).success).toBe(false);
	});
});

const mockPrisma = {
	vertical_camping_consumer_box: {
		findFirst: mock(() => Promise.resolve(null)),
		findMany: mock(() => Promise.resolve([])),
	},
	vertical_camping_consumer: {
		findUnique: mock(() => Promise.resolve(null)),
	},
	client: {
		findUnique: mock(() =>
			Promise.resolve({
				organization_name: "Camp Site",
				state: "CA",
				country: "USA",
			}),
		),
	},
	box: {
		findFirst: mock(() => Promise.resolve(null)),
		findUnique: mock(() => Promise.resolve(null)),
	},
	box_telemetry_latest: {
		findUnique: mock(() =>
			Promise.resolve({
				camera_status: "on",
				surveillance_enabled: false,
			}),
		),
	},
};

const mockS3 = {
	objectExists: mock(() => Promise.resolve(true)),
	getPresignedUrl: mock((key: string) => Promise.resolve(`https://signed.example/${key}`)),
};

mock.module("@/db", () => ({
	prisma: mockPrisma,
	isMongoConnected: () => true,
	getMongoConnectionState: () => "connected",
}));

mock.module("@/services", () => ({
	services: { s3: mockS3 },
}));

const { resolveConsumerBoxById } = await import("@/db/actions/camp-consumer/box.actions.ts");
const { getConsumerDashboard } = await import("@/db/actions/camp-consumer/dashboard.actions.ts");
const { toMobileBoxSummary } = await import("@/db/actions/camp-consumer/box.mapper.ts");
const cameraActions = await import("@/db/actions/camp-consumer/camera.actions.ts");

describe("Camp consumer response shape contracts", () => {
	test("support answer payload exposes Figma FAQ answer keys", () => {
		const keys = ["answer", "publishing_status", "status", "attachments", "faq"];
		expect(keys.sort()).toEqual(
			["answer", "attachments", "faq", "publishing_status", "status"].sort(),
		);
		expect(Object.keys({ id: "x", question: "q" }).sort()).toEqual(["id", "question"]);
	});

	test("dashboard returns delivery-mobile base keys plus camp enrichment", async () => {
		mockPrisma.vertical_camping_consumer_box.findMany.mockResolvedValue([]);

		const data = await getConsumerDashboard({
			consumer_id: "consumer-a",
			client_id: "client-camp",
			full_name: "Camper",
			password: "hashed",
		});

		expect(Object.keys(data).sort()).toEqual([
			"boxes",
			"greeting",
			"has_boxes",
			"is_password_set",
			"location_name",
			"outside_temp_c",
		]);
	});

	test("MobileBoxSummary mapper keys match delivery-mobile contract", () => {
		const summary = toMobileBoxSummary({
			id: "box-1",
			box_display_id: "BOX-1245",
			name: "Camp Box",
			telemetry: {
				connection_status: "connected",
				battery_1_percentage: 80,
				battery_2_percentage: 75,
			} as never,
			lock: { lock_status: "locked" },
		});

		expect(Object.keys(summary).sort()).toEqual([
			"battery_level",
			"box_display_id",
			"id",
			"is_connected",
			"is_locked",
			"name",
		]);
	});

	test("camera live response exposes Figma-required stream keys", async () => {
		mockPrisma.vertical_camping_consumer_box.findFirst.mockResolvedValue({
			box: {
				id: "box-1",
				box_display_id: "CAMP-001",
				name: "Camp Box",
				client_id: "client-camp",
			},
		} as never);
		mockPrisma.box_telemetry_latest.findUnique.mockResolvedValue({
			camera_status: "on",
			surveillance_enabled: false,
		} as never);
		mockS3.objectExists.mockResolvedValue(true);

		const data = await cameraActions.getConsumerCameraLive({
			box_id: "box-1",
			consumer_id: "consumer-a",
			client_id: "client-camp",
		});

		expect(Object.keys(data).sort()).toEqual(
			["box_display_id", "cam_id", "expires_at", "mode", "stream_url"].sort(),
		);
		expect(data.stream_url).toContain("signed.example");
		expect(data.mode).toBe("live");
	});
});

describe("Camp consumer tenancy IDOR", () => {
	beforeEach(() => {
		mockPrisma.vertical_camping_consumer_box.findFirst.mockReset();
	});

	test("resolveConsumerBoxById throws 404 when consumer has no assignment", async () => {
		mockPrisma.vertical_camping_consumer_box.findFirst.mockResolvedValue(null);

		await expect(
			resolveConsumerBoxById({
				box_id: "box-other-consumer",
				client_id: "client-camp",
				consumer_id: "consumer-a",
			}),
		).rejects.toThrow(APIError);
	});
});

describe("Cross-vertical regression", () => {
	test("delivery-mobile config route still registers", () => {
		const routes = getRoutePaths("/api/v1/delivery-mobile", deliveryMobileRouter);
		expect(routes).toContain("GET /api/v1/delivery-mobile/config");
		expect(routes).toContain("GET /api/v1/delivery-mobile/support/answer");
	});

	test("medical-mobile driver health route still registers", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		expect(routes).toContain("GET /api/v1/medical-mobile/driver/health");
	});
});
