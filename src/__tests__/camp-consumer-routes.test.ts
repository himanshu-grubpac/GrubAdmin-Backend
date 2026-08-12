import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { campConsumerRouter } from "@/modules/camp-consumer";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { APIError } from "@/types/error";

function getCampConsumerRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/camp-consumer", campConsumerRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

const EXPECTED_ROUTES = [
	"GET /api/v1/camp-consumer/health",
	"POST /api/v1/camp-consumer/auth/login",
	"POST /api/v1/camp-consumer/auth/send-otp",
	"POST /api/v1/camp-consumer/auth/verify-otp",
	"POST /api/v1/camp-consumer/auth/resend-otp",
	"POST /api/v1/camp-consumer/auth/forget-password/otp/send",
	"POST /api/v1/camp-consumer/auth/forget-password/otp/verify",
	"POST /api/v1/camp-consumer/auth/forget-password/set-password",
	"POST /api/v1/camp-consumer/auth/set-password",
	"POST /api/v1/camp-consumer/auth/forget-password/otp/resend",
	"POST /api/v1/camp-consumer/auth/reset-password",
	"POST /api/v1/camp-consumer/auth/check-account",
	"POST /api/v1/camp-consumer/auth/logout",
	"POST /api/v1/camp-consumer/auth/refresh",
	"GET /api/v1/camp-consumer/account/me",
	"GET /api/v1/camp-consumer/profile",
	"PUT /api/v1/camp-consumer/account",
	"PUT /api/v1/camp-consumer/account/password",
	"DELETE /api/v1/camp-consumer/account",
	"GET /api/v1/camp-consumer/dashboard",
	"GET /api/v1/camp-consumer/support/category",
	"GET /api/v1/camp-consumer/support/faq",
	"GET /api/v1/camp-consumer/config",
	"GET /api/v1/camp-consumer/boxes",
	"POST /api/v1/camp-consumer/boxes",
	"GET /api/v1/camp-consumer/boxes/:box_id",
	"DELETE /api/v1/camp-consumer/boxes/:box_id",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/settings",
	"POST /api/v1/camp-consumer/boxes/:box_id/connection",
	"DELETE /api/v1/camp-consumer/boxes/:box_id/connection",
	"POST /api/v1/camp-consumer/boxes/:box_id/lock/otp",
	"POST /api/v1/camp-consumer/boxes/:box_id/lock/verify",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/lock",
	"GET /api/v1/camp-consumer/boxes/:box_id/camera/live",
	"GET /api/v1/camp-consumer/boxes/:box_id/camera/feeds",
	"GET /api/v1/camp-consumer/boxes/:box_id/camera/feeds/:feed_id/stream",
	"POST /api/v1/camp-consumer/boxes/:box_id/camera/upload-url",
	"POST /api/v1/camp-consumer/boxes/:box_id/camera/feeds/register",
	"PATCH /api/v1/camp-consumer/boxes/:box_id/camera/surveillance-mode",
	"GET /api/v1/camp-consumer/notification",
	"PATCH /api/v1/camp-consumer/notification",
];

describe("Camp consumer route registration", () => {
	test("registers ~41 Phase 3 routes (no restaurant/employee/transfer)", () => {
		const routes = [...new Set(getCampConsumerRoutePaths())];

		for (const route of EXPECTED_ROUTES) {
			expect(routes).toContain(route);
		}

		expect(routes.some((r) => r.includes("/restaurant"))).toBe(false);
		expect(routes.some((r) => r.includes("/employee"))).toBe(false);
		expect(routes.some((r) => r.includes("transfer-ownership"))).toBe(false);
		expect(routes.length).toBeGreaterThanOrEqual(EXPECTED_ROUTES.length);
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
};

mock.module("@/db", () => ({
	prisma: mockPrisma,
	isMongoConnected: () => true,
	getMongoConnectionState: () => "connected",
}));

mock.module("@/middlewares/auth/camping-auth-guard.ts", () => ({
	campingAuthGuard: () => async (_c: unknown, next: () => Promise<void>) => {
		const ctx = _c as {
			set: (k: string, v: unknown) => void;
		};
		ctx.set("user_id", "consumer-a");
		ctx.set("client_id", "client-camp");
		ctx.set("user", {
			id: "consumer-a",
			email: "camper@example.com",
			full_name: "Camper",
			status: "active",
		});
		await next();
	},
}));

const { resolveConsumerBoxById } = await import("@/db/actions/camp-consumer/box.actions.ts");
const { getConsumerDashboard } = await import("@/db/actions/camp-consumer/dashboard.actions.ts");
const { toMobileBoxSummary } = await import("@/db/actions/camp-consumer/box.mapper.ts");

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

describe("Camp consumer response key contracts", () => {
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
		expect(data.is_password_set).toBe(true);
		expect(data.has_boxes).toBe(false);
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
});

describe("Delivery-mobile regression (Phase 3)", () => {
	test("delivery-mobile config route still registers", () => {
		const app = new Hono();
		app.route("/api/v1/delivery-mobile", deliveryMobileRouter);
		const routes = app.routes.map((r) => `${r.method} ${r.path}`);
		expect(routes).toContain("GET /api/v1/delivery-mobile/config");
	});
});
