import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { medicalMobileDriverRouter } from "@/modules/medical-mobile/driver";
import { medicalMobileOwnerRouter } from "@/modules/medical-mobile/owner";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { campConsumerRouter } from "@/modules/camp-consumer";
import { APIError } from "@/types/error";

function getRoutePaths(basePath: string, router: Hono): string[] {
	const app = new Hono();
	app.route(basePath, router);
	return app.routes.map((route) => `${route.method} ${route.path}`);
}

/** Figma Backend API Requirements — SHARED + MEDICAL-SPECIFIC routes */
const FIGMA_SHARED_ROUTES = [
	"POST /api/v1/medical-mobile/driver/auth/login",
	"POST /api/v1/medical-mobile/driver/auth/send-otp",
	"POST /api/v1/medical-mobile/driver/auth/verify-otp",
	"POST /api/v1/medical-mobile/driver/auth/resend-otp",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/otp/send",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/otp/verify",
	"POST /api/v1/medical-mobile/driver/auth/forget-password/set-password",
	"POST /api/v1/medical-mobile/driver/auth/set-password",
	"POST /api/v1/medical-mobile/driver/auth/reset-password",
	"POST /api/v1/medical-mobile/driver/auth/check-account",
	"POST /api/v1/medical-mobile/driver/auth/logout",
	"POST /api/v1/medical-mobile/driver/auth/refresh",
	"GET /api/v1/medical-mobile/driver/account/me",
	"GET /api/v1/medical-mobile/driver/profile",
	"DELETE /api/v1/medical-mobile/driver/account",
	"GET /api/v1/medical-mobile/driver/dashboard",
	"GET /api/v1/medical-mobile/driver/config",
	"GET /api/v1/medical-mobile/driver/support/category",
	"GET /api/v1/medical-mobile/driver/support/faq",
	"GET /api/v1/medical-mobile/driver/support/answer",
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
	"GET /api/v1/medical-mobile/driver/notification",
	"PATCH /api/v1/medical-mobile/driver/notification",
];

const FIGMA_MEDICAL_SPECIFIC_ROUTES = [
	"GET /api/v1/medical-mobile/driver/emergency/call-metadata",
	"POST /api/v1/medical-mobile/driver/emergency/alert",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id/location",
	"POST /api/v1/medical-mobile/driver/boxes/:box_id/location/share",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id/diagnostics",
	"GET /api/v1/medical-mobile/driver/boxes/:box_id/alerts",
];

const FIGMA_BLOCKED_ON_DRIVER = [
	"POST /api/v1/medical-mobile/driver/restaurant",
	"GET /api/v1/medical-mobile/driver/employee",
	"POST /api/v1/medical-mobile/driver/account/transfer-ownership",
	"GET /api/v1/medical-mobile/driver/account/mygrubpacs",
	"POST /api/v1/medical-mobile/driver/notification/test-trigger",
];

describe("Medical mobile driver contract (Figma Backend API Requirements)", () => {
	test("mounts all SHARED + MEDICAL-SPECIFIC routes from Figma doc", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);

		for (const route of [...FIGMA_SHARED_ROUTES, ...FIGMA_MEDICAL_SPECIFIC_ROUTES]) {
			expect(routes).toContain(route);
		}
		expect(routes).toContain("GET /api/v1/medical-mobile/driver/health");
	});

	test("does not mount delivery-manager BLOCKED routes", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);

		for (const blocked of FIGMA_BLOCKED_ON_DRIVER) {
			expect(routes).not.toContain(blocked);
		}
		expect(routes.some((r) => r.includes("/restaurant"))).toBe(false);
		expect(routes.some((r) => r.includes("/employee"))).toBe(false);
	});

	test("owner-only grublock routes are not mounted on driver", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		expect(routes.some((r) => r.includes("/grublock/emergency_unlock"))).toBe(false);
		expect(routes.some((r) => r.includes("/boxes/claim"))).toBe(false);
	});

	test("camp-only camera routes are not mounted on driver", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		expect(routes.some((r) => r.includes("/camera/"))).toBe(false);
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

const { getEmergencyCallMetadata } = await import(
	"@/db/actions/medical-mobile/emergency.actions.ts"
);
const { getHandlerDashboard } = await import("@/db/actions/medical-mobile/dashboard.actions.ts");
const { toMobileBoxSummary } = await import("@/db/actions/medical-mobile/box.mapper.ts");

describe("Medical mobile driver response shape contracts", () => {
	test("dashboard returns Figma-required keys", async () => {
		const data = await getHandlerDashboard({
			employee_id: "handler-1",
			client_id: "client-a",
			first_name: "Alex",
			password: "hashed",
		});

		expect(Object.keys(data).sort()).toEqual(
			[
				"boxes",
				"greeting",
				"has_boxes",
				"is_password_set",
				"location_name",
				"outside_temp_c",
			].sort(),
		);
		expect(data.is_password_set).toBe(true);
	});

	test("emergency call-metadata returns facility_name and phone_e164", async () => {
		const data = await getEmergencyCallMetadata("client-a");
		expect(Object.keys(data).sort()).toEqual(["facility_name", "phone_e164"]);
	});

	test("MobileBoxSummary keys match delivery-mobile contract", () => {
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
				} as never,
				lock: { lock_status: "locked" },
			},
			"handler-1",
		);

		expect(Object.keys(summary).sort()).toEqual(
			["battery_level", "box_display_id", "id", "is_connected", "is_locked", "name"].sort(),
		);
	});

	test("location share payload exposes native OS share fields", async () => {
		const { buildMedicalLocationSharePayload } = await import(
			"@/db/actions/medical-mobile/location-share.actions.ts"
		);

		const payload = buildMedicalLocationSharePayload(
			{
				lat: 12.9716,
				lng: 77.5946,
				updated_at: "2026-08-12T10:00:00.000Z",
				address_hint: "City Hospital, Delhi, India",
				gps_status: "on",
			},
			"BOX-1245",
		);

		expect(Object.keys(payload).sort()).toEqual(
			[
				"address_hint",
				"gps_status",
				"lat",
				"lng",
				"maps_url",
				"share_text",
				"updated_at",
			].sort(),
		);
		expect(payload.maps_url).toBe(
			"https://www.google.com/maps/search/?api=1&query=12.9716,77.5946",
		);
		expect(payload.share_text).toContain("BOX-1245");
		expect(payload.share_text).toContain(payload.maps_url);
		expect(payload.share_text).toContain("maps.apple.com");
	});
});

describe("Cross-vertical regression", () => {
	test("delivery-mobile config route still registers", () => {
		const routes = getRoutePaths("/api/v1/delivery-mobile", deliveryMobileRouter);
		expect(routes).toContain("GET /api/v1/delivery-mobile/config");
		expect(routes).toContain("GET /api/v1/delivery-mobile/support/answer");
	});

	test("owner router mounts separately with claim route", () => {
		const routes = getRoutePaths("/api/v1/medical-mobile/owner", medicalMobileOwnerRouter);
		expect(routes).toContain("POST /api/v1/medical-mobile/owner/boxes/claim");
	});

	test("camp consumer camera routes stay on camp only", () => {
		const campRoutes = getRoutePaths("/api/v1/camp-consumer", campConsumerRouter);
		expect(campRoutes).toContain("GET /api/v1/camp-consumer/boxes/:box_id/camera/live");

		const driverRoutes = getRoutePaths("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		expect(driverRoutes.some((r) => r.includes("/camera/"))).toBe(false);
	});
});

describe("Medical mobile driver tenancy IDOR", () => {
	beforeEach(() => {
		mockPrisma.vertical_medical_employee_box.findFirst.mockReset();
	});

	test("resolveHandlerBoxById throws when handler has no assignment", async () => {
		const { resolveHandlerBoxById } = await import("@/db/actions/medical-mobile/box.actions.ts");
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
