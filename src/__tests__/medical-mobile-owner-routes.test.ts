import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Hono } from "hono";
import { medicalMobileOwnerRouter } from "@/modules/medical-mobile/owner";
import { medicalMobileDriverRouter } from "@/modules/medical-mobile/driver";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { APIError } from "@/types/error";

function getOwnerRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/medical-mobile/owner", medicalMobileOwnerRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

const EXPECTED_ROUTES = [
	"GET /api/v1/medical-mobile/owner/health",
	"POST /api/v1/medical-mobile/owner/auth/login",
	"POST /api/v1/medical-mobile/owner/auth/send-otp",
	"POST /api/v1/medical-mobile/owner/auth/verify-otp",
	"POST /api/v1/medical-mobile/owner/auth/resend-otp",
	"POST /api/v1/medical-mobile/owner/auth/forget-password/otp/send",
	"POST /api/v1/medical-mobile/owner/auth/forget-password/otp/verify",
	"POST /api/v1/medical-mobile/owner/auth/forget-password/set-password",
	"POST /api/v1/medical-mobile/owner/auth/set-password",
	"POST /api/v1/medical-mobile/owner/auth/forget-password/otp/resend",
	"POST /api/v1/medical-mobile/owner/auth/reset-password",
	"POST /api/v1/medical-mobile/owner/auth/check-account",
	"POST /api/v1/medical-mobile/owner/auth/logout",
	"POST /api/v1/medical-mobile/owner/auth/refresh",
	"GET /api/v1/medical-mobile/owner/account/me",
	"GET /api/v1/medical-mobile/owner/profile",
	"PUT /api/v1/medical-mobile/owner/account",
	"PUT /api/v1/medical-mobile/owner/account/password",
	"DELETE /api/v1/medical-mobile/owner/account",
	"GET /api/v1/medical-mobile/owner/dashboard",
	"GET /api/v1/medical-mobile/owner/support/category",
	"GET /api/v1/medical-mobile/owner/support/faq",
	"GET /api/v1/medical-mobile/owner/config",
	"GET /api/v1/medical-mobile/owner/boxes",
	"POST /api/v1/medical-mobile/owner/boxes/claim",
	"GET /api/v1/medical-mobile/owner/boxes/:box_id",
	"DELETE /api/v1/medical-mobile/owner/boxes/:box_id",
	"PATCH /api/v1/medical-mobile/owner/boxes/:box_id/settings",
	"POST /api/v1/medical-mobile/owner/boxes/:box_id/connection",
	"DELETE /api/v1/medical-mobile/owner/boxes/:box_id/connection",
	"GET /api/v1/medical-mobile/owner/boxes/:box_id/location",
	"POST /api/v1/medical-mobile/owner/boxes/:box_id/location/share",
	"GET /api/v1/medical-mobile/owner/boxes/:box_id/diagnostics",
	"GET /api/v1/medical-mobile/owner/boxes/:box_id/alerts",
	"GET /api/v1/medical-mobile/owner/emergency/call-metadata",
	"PATCH /api/v1/medical-mobile/owner/boxes/:box_id/lock",
	"PATCH /api/v1/medical-mobile/owner/grublock/lock",
	"PATCH /api/v1/medical-mobile/owner/grublock/emergency_unlock",
	"GET /api/v1/medical-mobile/owner/notification",
	"PATCH /api/v1/medical-mobile/owner/notification",
];

describe("Medical mobile owner route registration", () => {
	test("registers ~33 Phase 2 routes (no restaurant/employee/transfer/QR register)", () => {
		const routes = [...new Set(getOwnerRoutePaths())];

		for (const route of EXPECTED_ROUTES) {
			expect(routes).toContain(route);
		}

		expect(routes.some((r) => r.includes("/restaurant"))).toBe(false);
		expect(routes.some((r) => r.includes("/employee"))).toBe(false);
		expect(routes.some((r) => r.includes("transfer-ownership"))).toBe(false);
		expect(routes.some((r) => r === "POST /api/v1/medical-mobile/owner/boxes")).toBe(false);
		expect(routes.some((r) => r.includes("/lock/otp"))).toBe(false);
		expect(routes.some((r) => r.includes("/lock/verify"))).toBe(false);
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
				state: "Delhi",
				country: "India",
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
		ctx.set("user_id", "owner-client-1");
		ctx.set("client_id", "client-a");
		ctx.set("vertical_id", "vertical-medical");
		await next();
	},
}));

const { resolveOwnerBoxById, toOwnerDashboardBoxCard } = await import(
	"@/db/actions/medical-mobile/owner-box.actions.ts"
);
const { getOwnerDashboard } = await import(
	"@/db/actions/medical-mobile/owner-dashboard.actions.ts"
);

describe("Medical mobile owner tenancy IDOR", () => {
	beforeEach(() => {
		mockPrisma.vertical_medical_employee_box.findFirst.mockReset();
	});

	test("resolveOwnerBoxById throws 404 when owner has no claim", async () => {
		mockPrisma.vertical_medical_employee_box.findFirst.mockResolvedValue(null);

		await expect(
			resolveOwnerBoxById({
				box_id: "box-other-hospital",
				client_id: "client-a",
			}),
		).rejects.toThrow(APIError);
	});
});

describe("Medical mobile owner response key contracts", () => {
	test("owner dashboard box cards expose connection_status and grublock_status", () => {
		const card = toOwnerDashboardBoxCard({
			id: "box-1",
			box_display_id: "BOX-1245",
			name: "Test Box",
			medical_connection_employee_id: null,
			telemetry: { connection_status: "connected" } as any,
			lock: { lock_status: "locked" },
		});

		expect(Object.keys(card).sort()).toEqual(
			["connection_status", "display_id", "grublock_status", "id"].sort(),
		);
		expect(card.connection_status).toBe("connected");
		expect(card.grublock_status).toBe("locked");
	});

	test("owner dashboard data includes greeting, location, outside_temp_c, boxes", async () => {
		mockPrisma.vertical_medical_employee_box.findMany.mockResolvedValue([]);
		mockPrisma.box.findFirst.mockResolvedValue(null);

		const data = await getOwnerDashboard({
			client_id: "client-a",
			owner_name: "Ravi",
			password: "secret",
		});

		expect(Object.keys(data).sort()).toEqual(
			[
				"boxes",
				"greeting",
				"has_boxes",
				"is_password_set",
				"location",
				"outside_temp_c",
			].sort(),
		);
		expect(typeof data.greeting).toBe("string");
	});
});

describe("Delivery-mobile and driver regression", () => {
	test("delivery-mobile box routes unchanged", () => {
		const app = new Hono();
		app.route("/api/v1/delivery-mobile", deliveryMobileRouter);
		const routes = app.routes.map((r) => `${r.method} ${r.path}`);
		expect(routes).toContain("GET /api/v1/delivery-mobile/boxes");
	});

	test("driver router still has QR register and unlock OTP", () => {
		const app = new Hono();
		app.route("/api/v1/medical-mobile/driver", medicalMobileDriverRouter);
		const routes = app.routes.map((r) => `${r.method} ${r.path}`);
		expect(routes).toContain("POST /api/v1/medical-mobile/driver/boxes");
		expect(routes).toContain("POST /api/v1/medical-mobile/driver/boxes/:box_id/lock/otp");
	});
});
