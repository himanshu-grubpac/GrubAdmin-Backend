import { describe, expect, test, spyOn, mock } from "bun:test";
import { Hono } from "hono";
import { categoriesEnum } from "hospitality/validators/log.validators.ts";
import { JWT } from "@/utils/jwt.ts";
import * as systemLogAction from "@/db/actions/system-log.action.ts";
import * as hospitalityEmployeeAction from "@/db/actions/hospitality/employee.actions";
import * as mongoSchema from "@/db/mongo-schema";
import { formatHospitalityGrubpacLogsForResponse, formatHospitalityGrubpacLogAction } from "hospitality/utils/hospitality-log-display.ts";
import {
	deriveBulkSettingsActionLabel,
	formatSettingsChangedTimestamp,
	buildHospitalityBoxChangedSubline,
} from "hospitality/utils/settings-changed-display.ts";

const mockHospitalityAuthClient = {
	id: "mock_client_id",
	name: "Mock Hospitality Admin",
	organization_name: "Mock Org",
	vertical_id: "mock_vertical_id",
	status: "active" as const,
	auth_token_version: 0,
	vertical: { name: "Hospitality" },
};

const mockPrismaClientFindUnique = mock(async () => mockHospitalityAuthClient);
const mockPrismaBoxFindMany = mock(async () => [] as unknown[]);
const mockPrismaFloorFindMany = mock(async () => [] as unknown[]);

mock.module("@/db", () => ({
	prisma: {
		client: { findUnique: mockPrismaClientFindUnique },
		box: { findMany: mockPrismaBoxFindMany },
		vertical_hospitality_floor: { findMany: mockPrismaFloorFindMany },
	},
	isPrismaConnected: () => true,
	waitForDatabases: async () => ({ prisma: true, mongodb: true }),
}));

const { hospitalityRouter } = await import("@/modules/hospitality");

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

function resetHospitalityDbMocks(boxFindManyResult: unknown[] = []) {
	mockPrismaClientFindUnique.mockImplementation(async () => mockHospitalityAuthClient);
	mockPrismaBoxFindMany.mockImplementation(async () => boxFindManyResult);
	mockPrismaFloorFindMany.mockImplementation(async () => []);
	mock.module("@/db", () => ({
		prisma: {
			client: { findUnique: mockPrismaClientFindUnique },
			box: { findMany: mockPrismaBoxFindMany },
			vertical_hospitality_floor: { findMany: mockPrismaFloorFindMany },
		},
		isPrismaConnected: () => true,
		waitForDatabases: async () => ({ prisma: true, mongodb: true }),
	}));
}

describe("Hospitality logs and support integration", () => {
	test("hospitality router registers box logs routes", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"POST /api/v1/hospitality/grubpac/logs",
			"GET /api/v1/hospitality/grubpac/logs/dropdowns",
			"POST /api/v1/hospitality/grubpac/settings-changed",
		];
		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});

	test("log validators do not contain smart locks or restaurants", () => {
		expect(categoriesEnum).toContain("GrubPac");
		expect(categoriesEnum).toContain("Profile");
		expect(categoriesEnum).not.toContain("GrubLock");
		expect(categoriesEnum).not.toContain("Restaurant");
		expect(categoriesEnum).not.toContain("Department");
	});

	test("settings-changed endpoint requires authentication", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/grubpac/settings-changed", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ batch_id: "01TESTBATCH000000000000000" }),
		});
		expect(res.status).toBe(401);
	});

	test("settings-changed display helpers match FE contract", () => {
		expect(deriveBulkSettingsActionLabel({ power_status: "on" })).toBe("Box turned ON");
		expect(deriveBulkSettingsActionLabel({ ioniser_status: "off" })).toBe("Ioniser turned OFF");
		expect(
			deriveBulkSettingsActionLabel({
				dual_zone_status: "on",
				zone1_temp: 4,
			}),
		).toBe("Dual mode on, Temperature set to 4°C");
		expect(deriveBulkSettingsActionLabel({ room: null })).toBe("Room assignment removed");

		expect(
			buildHospitalityBoxChangedSubline({
				box_display_id: "HOSP-001",
				room: "302",
				floor_name: "Floor 1",
			}),
		).toBe("#HOSP-001 | Room 302 | Floor 1");

		const formatted = formatSettingsChangedTimestamp(new Date("2026-08-17T15:30:45"));
		expect(formatted).toMatch(/17 Aug '26, 15:30:45/);
	});

	test("box logs endpoints require authentication", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const resSearch = await app.request("/api/v1/hospitality/grubpac/logs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ filters: [{ category: "GrubPac" }] }),
		});
		expect(resSearch.status).toBe(401);

		const resDropdowns = await app.request("/api/v1/hospitality/grubpac/logs/dropdowns", {
			method: "GET",
		});
		expect(resDropdowns.status).toBe(401);
	});

	test("formatHospitalityGrubpacLogsForResponse preserves fields from mongoose-like docs", () => {
		const createdAt = new Date("2026-06-24T04:00:00Z");
		const mongooseLike = {
			type: "Box status",
			category: "GrubPac",
			metadata: { state: "ON" },
			toObject() {
				return {
					id: "log_01",
					type: this.type,
					category: this.category,
					metadata: this.metadata,
					createdAt,
				};
			},
		};

		const [row] = formatHospitalityGrubpacLogsForResponse([mongooseLike as any], {
			floorNames: new Map(),
		});

		expect(row.type).toBe("Box status");
		expect(row.category).toBe("GrubPac");
		expect(row.createdAt).toBe(createdAt.toISOString());
		expect(row.created_at).toBe(createdAt.toISOString());
		expect(row.action).toBe("Box turned ON");
	});

	test("formatHospitalityGrubpacLogAction matches Figma box-details copy patterns", () => {
		const floorNames = new Map([["floor_ulid", "Bombay Eats – Andheri"]]);
		const context = { floorNames };

		expect(
			formatHospitalityGrubpacLogAction(
				{ type: "Activation", actor: { name: "Akash Sharma" } },
				context,
			),
		).toBe("Box reactivated and marked as unassigned by Akash Sharma");

		expect(
			formatHospitalityGrubpacLogAction(
				{
					type: "Suspension",
					actor: { name: "01KZTRBAZ3ZVPNVKNRVJYYQ9N3" },
					description: "[Fill Pac 0002, 01KZTRBAZ3ZVPNVKNRVJYYQ9N3] suspended by [Manager, ulid]",
				},
				context,
			),
		).toBe("Box suspended by Manager");
	});

	test("support endpoints require authentication", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const endpoints = [
			"/api/v1/hospitality/support/category",
			"/api/v1/hospitality/support/faq",
			"/api/v1/hospitality/support/search",
			"/api/v1/hospitality/support/answer",
			"/api/v1/hospitality/support/faq/attachment/download",
		];

		for (const endpoint of endpoints) {
			const res = await app.request(endpoint, { method: "GET" });
			expect(res.status).toBe(401);
		}
	});

	test("mock request and generate responses", async () => {
		const verifySpy = spyOn(JWT, "verifyHospitalityAuthToken").mockImplementation(() => {
			return { id: "mock_client_id", role: "admin", token_version: 0 } as any;
		});

		const employeeSpy = spyOn(
			hospitalityEmployeeAction,
			"getUniqueHospitalityEmployee",
		).mockImplementation(async () => ({
			type: "admin" as const,
			employee: { id: "mock_client_id" } as any,
		}));

		resetHospitalityDbMocks();

		const getSystemLogsSpy = spyOn(systemLogAction, "getSystemLogs").mockImplementation(async () => {
			return {
				logs: [
					{
						id: "log_01",
						category: "GrubPac",
						type: "Box status",
						actor: { id: "mock_client_id", name: "Admin", role: "admin" },
						subject: { id: "box_01", name: "Suite 302 Box", type: "box" },
						client_id: "mock_client_id",
						metadata: { power_status: "on" },
						created_at: new Date("2026-06-24T04:00:00Z"),
					},
					{
						id: "log_02",
						category: "GrubPac",
						type: "Suspension",
						actor: { id: "mock_client_id", name: "Admin", role: "admin" },
						subject: { id: "box_02", name: "Suite 304 Box", type: "box" },
						client_id: "mock_client_id",
						metadata: {},
						created_at: new Date("2026-06-24T04:10:00Z"),
					},
				],
				page: 1,
				page_size: 10,
				page_count: 1,
				total_count: 2,
			} as any;
		});

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const dropdownsRes = await app.request("/api/v1/hospitality/grubpac/logs/dropdowns", {
			method: "GET",
			headers: { Authorization: "Bearer mock_token_value" },
		});
		expect(dropdownsRes.status).toBe(200);

		const logsRes = await app.request("/api/v1/hospitality/grubpac/logs", {
			method: "POST",
			headers: {
				Authorization: "Bearer mock_token_value",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				filters: [{ category: "GrubPac", types: ["Box status", "Suspension"] }],
				page: 1,
				limit: 10,
			}),
		});

		expect(logsRes.status).toBe(200);
		const logsJson = (await logsRes.json()) as {
			data: {
				logs: Array<{
					type: string;
					createdAt?: string;
					action?: string;
					actionHighlight?: boolean;
				}>;
			};
		};
		expect(logsJson.data.logs[0]!.type).toBe("Box status");
		expect(logsJson.data.logs[0]!.createdAt).toBeDefined();
		expect(logsJson.data.logs[0]!.action).toBe("Box turned ON");
		expect(logsJson.data.logs[1]!.actionHighlight).toBe(true);

		verifySpy.mockRestore();
		employeeSpy.mockRestore();
		getSystemLogsSpy.mockRestore();
	});

	test("mock settings-changed audit by batch_id returns FE contract shape", async () => {
		const verifySpy = spyOn(JWT, "verifyHospitalityAuthToken").mockImplementation(() => {
			return { id: "mock_client_id", role: "admin", token_version: 0 } as any;
		});

		const employeeSpy = spyOn(
			hospitalityEmployeeAction,
			"getUniqueHospitalityEmployee",
		).mockImplementation(async () => ({
			type: "admin" as const,
			employee: { id: "mock_client_id" } as any,
		}));

		const batchId = "01BATCH000000000000000000";
		const boxId = "01KZTRBAZ3ZVPNVKNRVJYYQ9N3";
		const grubpacFindSpy = spyOn(mongoSchema.GrubpacLog, "find").mockReturnValue({
			sort: () => ({
				limit: () => ({
					lean: async () => [
						{
							subject: { id: boxId },
							metadata: { batch_id: batchId, settings_action_label: "Box turned ON" },
							type: "Box status",
							createdAt: new Date("2026-08-17T10:00:00Z"),
						},
					],
				}),
			}),
		} as any);

		resetHospitalityDbMocks([
			{
				id: boxId,
				name: "Suite 302 Box",
				box_display_id: "HOSP-001",
				room: "302",
				hospitality_floor_boxes: [{ room: "302", floor: { name: "Floor 1" } }],
			},
		]);

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/grubpac/settings-changed", {
			method: "POST",
			headers: {
				Authorization: "Bearer mock_token_value",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ batch_id: batchId }),
		});

		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			success: boolean;
			data: {
				batch_id: string;
				action_label: string;
				boxes: Array<{ name: string; subline: string }>;
				timestamp: string;
			};
		};
		expect(json.success).toBe(true);
		expect(json.data.batch_id).toBe(batchId);
		expect(json.data.action_label).toBe("Box turned ON");
		expect(json.data.boxes[0]!.name).toBe("Suite 302 Box");
		expect(json.data.boxes[0]!.subline).toBe("#HOSP-001 | Room 302 | Floor 1");
		expect(json.data.timestamp).toMatch(/\d{2} Aug '26/);

		verifySpy.mockRestore();
		employeeSpy.mockRestore();
		grubpacFindSpy.mockRestore();
	});

	test("settings-changed returns empty audit when no logs match", async () => {
		const verifySpy = spyOn(JWT, "verifyHospitalityAuthToken").mockImplementation(() => {
			return { id: "mock_client_id", role: "admin", token_version: 0 } as any;
		});

		const employeeSpy = spyOn(
			hospitalityEmployeeAction,
			"getUniqueHospitalityEmployee",
		).mockImplementation(async () => ({
			type: "admin" as const,
			employee: { id: "mock_client_id" } as any,
		}));

		const grubpacFindSpy = spyOn(mongoSchema.GrubpacLog, "find").mockReturnValue({
			sort: () => ({
				limit: () => ({
					lean: async () => [],
				}),
			}),
		} as any);

		resetHospitalityDbMocks();

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		const res = await app.request("/api/v1/hospitality/grubpac/settings-changed", {
			method: "POST",
			headers: {
				Authorization: "Bearer mock_token_value",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ batch_id: "01EMPTY000000000000000000" }),
		});

		expect(res.status).toBe(200);
		const json = (await res.json()) as {
			success: boolean;
			data: { boxes: unknown[] };
		};
		expect(json.success).toBe(true);
		expect(json.data.boxes).toEqual([]);

		verifySpy.mockRestore();
		employeeSpy.mockRestore();
		grubpacFindSpy.mockRestore();
	});
});
