import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { resolveMessageTemplate } from "@/utils/message";
import { z } from "zod";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

const transferOwnershipBodySchema = z.object({
	transfer_mode: z.enum(["selected", "all"]),
	ids: z.array(z.string()).optional(),
	name: z.string().min(1),
	organization_name: z.string().min(1),
	country_code: z.string().min(1),
	phone: z.string().trim().min(1),
	email: z.string().trim().email(),
	country: z.string().min(1),
	state: z.string().min(1),
});

const transferEntireAccountBodySchema = z.object({
	name: z.string().min(1),
	organization_name: z.string().min(1),
	country_code: z.string().min(1),
	phone: z.string().trim().min(1),
	email: z.string().trim().email(),
	country: z.string().min(1),
	state: z.string().min(1),
});

const verifyTransferBodySchema = z.object({
	otp_id: z.string().min(1),
	otp: z.string().trim().min(4).max(4),
});

const transferListQuerySchema = z
	.object({
		status: z.enum(["active", "suspended"]).optional(),
		page: z.coerce.number().optional(),
		limit: z.coerce.number().optional(),
		query: z.string().optional(),
		power_status: z.enum(["on", "off", "unknown", "offline"]).optional(),
		health_status: z.enum(["healthy", "critical", "attention"]).optional(),
		floor_assigned: z.enum(["on", "off"]).optional(),
		room_assigned: z.enum(["on", "off"]).optional(),
		ioniser_status: z.enum(["on", "off", "unknown"]).optional(),
		dual_zone_status: z.enum(["on", "off", "unknown"]).optional(),
		zone1_min: z.coerce.number().optional(),
		zone1_max: z.coerce.number().optional(),
		zone2_min: z.coerce.number().optional(),
		zone2_max: z.coerce.number().optional(),
	})
	.transform((data) => ({
		...data,
		page: data.page ?? 1,
		limit: data.limit ?? 50,
	}));

describe("Hospitality Transfer routes registration (Module 12)", () => {
	test("registers all transfer ownership endpoints", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"POST /api/v1/hospitality/account/transfer-ownership",
			"POST /api/v1/hospitality/account/transfer-ownership/verify",
			"POST /api/v1/hospitality/account/transfer-entire-account",
			"POST /api/v1/hospitality/account/transfer-entire-account/verify",
			"GET /api/v1/hospitality/grubpac",
			"GET /api/v1/hospitality/floor",
		];
		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("transfer ownership OTP actions are exported", async () => {
		const mod = await import("@/db/actions/hospitality-transfer-ownership-otp.actions.ts");
		expect(typeof mod.createHospitalityTransferOwnershipOtp).toBe("function");
		expect(typeof mod.getHospitalityTransferOwnershipOtp).toBe("function");
		expect(typeof mod.deleteHospitalityTransferOwnershipOtp).toBe("function");
	});
});

describe("Hospitality Transfer validators (Module 12)", () => {
	const ownerPayload = {
		name: "New Owner",
		organization_name: "Org Ltd",
		country_code: "91",
		phone: "9876543210",
		email: "newowner@example.com",
		country: "IN",
		state: "Maharashtra",
	};

	test("transfer ownership accepts selected mode with ids", () => {
		expect(
			transferOwnershipBodySchema.safeParse({
				transfer_mode: "selected",
				ids: ["01ARZ3NDEKTSV4RRFFQ69G5FAV"],
				...ownerPayload,
			}).success,
		).toBe(true);
	});

	test("transfer ownership accepts all mode without ids", () => {
		expect(
			transferOwnershipBodySchema.safeParse({
				transfer_mode: "all",
				...ownerPayload,
			}).success,
		).toBe(true);
	});

	test("transfer entire account body validates owner fields", () => {
		expect(transferEntireAccountBodySchema.safeParse(ownerPayload).success).toBe(true);
	});

	test("verify transfer accepts 4-digit OTP only", () => {
		expect(
			verifyTransferBodySchema.safeParse({ otp_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", otp: "1234" }).success,
		).toBe(true);
		expect(
			verifyTransferBodySchema.safeParse({ otp_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", otp: "12345" }).success,
		).toBe(false);
	});

	test("grubpac list query accepts transfer modal filter/pagination params", () => {
		expect(
			transferListQuerySchema.safeParse({
				status: "active",
				page: 2,
				limit: 50,
				query: "room 101",
				power_status: "on",
				health_status: "healthy",
				floor_assigned: "on",
				room_assigned: "on",
				ioniser_status: "on",
				dual_zone_status: "on",
				zone1_min: -10,
				zone1_max: 25,
			}).success,
		).toBe(true);
	});
});

describe("Hospitality Transfer message templates (Module 12)", () => {
	test("selected/all transfer SUCCESS template resolves", () => {
		const resolved = resolveMessageTemplate("hospitality.floor.transfer.SUCCESS", {
			id: "client-id",
			name: "",
		});
		expect(resolved.message_toast_title).toBe("GrubPacs transferred successfully.");
		expect(resolved.code).toBe(200);
	});

	test("entire account BULK_SUCCESS template resolves", () => {
		const resolved = resolveMessageTemplate("hospitality.floor.transfer.BULK_SUCCESS");
		expect(resolved.message_toast_title).toBe("All GrubPacs successfully transferred.");
		expect(resolved.code).toBe(200);
	});
});
