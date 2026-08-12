import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { medicalMobileDriverRouter } from "@/modules/medical-mobile/driver";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { APIError } from "@/types/error";

function getMedicalDriverRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

const EXPECTED_ROUTES = [
	"GET /api/v1/medical-mobile/driver/health",
	"POST /api/v1/medical-mobile/driver/auth/login",
	"POST /api/v1/medical-mobile/driver/auth/send-otp",
	"POST /api/v1/medical-mobile/driver/auth/verify-otp",
	"POST /api/v1/medical-mobile/driver/auth/resend-otp",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/otp/send",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/otp/verify",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/set-password",
	"POST /api/v1/medical-mobile/driver/auth/set-password",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/otp/resend",
	"POST /api/v1/medical-mobile/driver/auth/reset-password",
	"POST /api/v1/medical-mobile/driver/auth/check-account",
	"POST /api/v1/medical-mobile/driver/auth/logout",
	"POST /api/v1/medical-mobile/driver/auth/refresh",
	"GET /api/v1/medical-mobile/driver/account/me",
	"GET /api/v1/medical-mobile/driver/profile",
	"PUT /api/v1/medical-mobile/driver/account/password",
	"DELETE /api/v1/medical-mobile/driver/account",
	"GET /api/v1/medical-mobile/driver/dashboard",
	"GET /api/v1/medical-mobile/driver/support/category",
	"GET /api/v1/medical-mobile/driver/support/faq",
	"GET /api/v1/medical-mobile/driver/config",
	"GET /api/v1/medical-mobile/driver/boxes",
	"POST /api/v1/medical-mobile/driver/boxes",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id",
	"DELETE /api/v1/medical-mobile/driver/boxes/:box_id",
	"PATCH /api/v1/medical-mobile/driver/boxes/:box_id/settings",
	"POST /api/v1/medical-mobile/driver/boxes/:box_id/connection",
	"DELETE /api/v1/medical-mobile/driver/boxes/:box_id/connection",
	"POST /api/v1/medical-mobile/driver/boxes/:box_id/lock/otp",
	"POST /api/v1/medical-mobile/driver/boxes/:box_id/lock/verify",
	"PATCH /api/v1/medical-mobile/driver/boxes/:box_id/lock",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id/location",
	"POST /api/v1/medical-mobile/driver/boxes/:box_id/location/share",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id/diagnostics",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id/alerts",
	"GET /api/v1/medical-mobile/driver/emergency/call-metadata",
	"POST /api/v1/medical-mobile/driver/emergency/alert",
	"GET /api/v1/medical-mobile/driver/notification",
	"PATCH /api/v1/medical-mobile/driver/notification",
];

describe("Medical mobile driver route registration", () => {
	test("registers ~38 Phase 1 routes (no restaurant/employee/transfer)", () => {
		const routes = [...new Set(getMedicalDriverRoutePaths())];

		for (const route of EXPECTED_ROUTES) {
			expect(routes).toContain(route);
		}

		expect(routes.some((r) => r.includes("/restaurant"))).toBe(false);
		expect(routes.some((r) => r.includes("/employee"))).toBe(false);
		expect(routes.some((r) => r.includes("transfer-ownership"))).toBe(false);
		expect(routes.some((r) => r.includes("test-trigger"))).toBe(false);
		expect(routes.some((r) => r.includes("mygrubpacs"))).toBe(false);
		expect(routes.length).toBeGreaterThanOrEqual(EXPECTED_ROUTES.length);
	});
});

const mockPrisma = {
	vertical_medical_employee_box: {
		findFirst: mock(() => Promise.resolve(null)),
		findMany: mock(() => Promise.resolve([])),
	},
	client: {
		findUnique: mock(() =>
			Promise.resolve({
				organization_name: "City Hospital",
				name: "City Hospital",
				country_code: "+91",
				mobile_number: "9876543210",
			}),
		),
	},
	box: {
		findFirst: mock(() => Promise.resolve(null)),
	},
};

mock.module("@/db", () => ({
	prisma: mockPrisma,
	isMongoConnected: () => true,
	getMongoConnectionState: () => "connected",
}));

mock.module("@/middlewares/auth", () => ({
	medicalMobileAuthGuard: () => async (_c: unknown, next: () => Promise<void>) => {
		const ctx = _c as {
			set: (k: string, v: unknown) => void;
			get: (k: string) => unknown;
		};
		ctx.set("user_id", "handler-1");
		ctx.set("client_id", "client-a");
		ctx.set("vertical_id", "vertical-medical");
		await next();
	},
}));

const { getEmergencyCallMetadata } = await import(
	"@/db/actions/medical-mobile/emergency.actions.ts"
);
const { resolveHandlerBoxById } = await import("@/db/actions/medical-mobile/box.actions.ts");

describe("Medical mobile driver tenancy IDOR", () => {
	beforeEach(() => {
		mockPrisma.vertical_medical_employee_box.findFirst.mockReset();
	});

	test("resolveHandlerBoxById throws 404 when handler has no assignment", async () => {
		mockPrisma.vertical_medical_employee_box.findFirst.mockResolvedValue(null);

		await expect(
			resolveHandlerBoxById({
				box_id: "box-other-hospital",
				client_id: "client-a",
				employee_id: "handler-1",
			}),
		).rejects.toThrow(APIError);
	});
});

describe("Medical mobile driver response key contracts", () => {
	test("emergency call-metadata returns facility_name and phone_e164", async () => {
		const data = await getEmergencyCallMetadata("client-a");
		expect(Object.keys(data).sort()).toEqual(["facility_name", "phone_e164"]);
		expect(typeof data.facility_name).toBe("string");
		expect(typeof data.phone_e164).toBe("string");
	});

	test("MobileBoxSummary mapper keys match delivery-mobile contract", async () => {
		const { toMobileBoxSummary } = await import("@/db/actions/medical-mobile/box.mapper.ts");
		const summary = toMobileBoxSummary(
			{
				id: "box-1",
				box_display_id: "BOX-1245",
				name: "Test Box",
				medical_connection_employee_id: "handler-1",
				telemetry: {
					connection_status: "connected",
					battery_1_percentage: 50,
					battery_2_percentage: null,
				} as any,
				lock: { lock_status: "locked" },
			},
			"handler-1",
		);

		expect(Object.keys(summary).sort()).toEqual(
			["battery_level", "box_display_id", "id", "is_connected", "is_locked", "name"].sort(),
		);
	});
});

describe("Delivery-mobile regression", () => {
	test("delivery-mobile box routes unchanged", () => {
		const app = new Hono();
		app.route("/api/v1/delivery-mobile", deliveryMobileRouter);
		const routes = app.routes.map((r) => `${r.method} ${r.path}`);
		expect(routes).toContain("GET /api/v1/delivery-mobile/boxes");
		expect(routes).toContain("PATCH /api/v1/delivery-mobile/boxes/:box_id/lock");
	});
});
