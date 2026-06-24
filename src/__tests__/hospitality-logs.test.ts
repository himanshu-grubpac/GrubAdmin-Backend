import { describe, expect, test, spyOn } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { categoriesEnum } from "hospitality/validators/log.validators.ts";
import { JWT } from "@/utils/jwt.ts";
import * as systemLogAction from "@/db/actions/system-log.action.ts";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Hospitality logs and support integration", () => {
	test("hospitality router registers box logs routes", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"POST /api/v1/hospitality/grubpac/logs",
			"GET /api/v1/hospitality/grubpac/logs/dropdowns",
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

	test("box logs endpoints require authentication", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		// Test search box logs without auth token -> 401
		const resSearch = await app.request("/api/v1/hospitality/grubpac/logs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ filters: [{ category: "GrubPac" }] }),
		});
		expect(resSearch.status).toBe(401);

		// Test dropdowns without auth token -> 401
		const resDropdowns = await app.request("/api/v1/hospitality/grubpac/logs/dropdowns", {
			method: "GET",
		});
		expect(resDropdowns.status).toBe(401);
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
		// Mock JWT authentication
		const verifySpy = spyOn(JWT, "verifyDeliveryAuthToken").mockImplementation(() => {
			return { id: "mock_client_id", role: "admin" } as any;
		});

		// Backup original global Prisma client and override with mock
		const originalPrisma = (globalThis as any).prisma;
		(globalThis as any).prisma = {
			client: {
				findUnique: async () => {
					return {
						id: "mock_client_id",
						name: "Mock Hospitality Admin",
						organization_name: "Mock Org",
						vertical_id: "mock_vertical_id",
						vertical: { name: "Hospitality" },
					} as any;
				}
			}
		} as any;

		// Mock getSystemLogs database query action
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
					}
				],
				page: 1,
				page_size: 10,
				page_count: 1,
				total_count: 2,
			} as any;
		});

		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);

		// 1. Test GET /api/v1/hospitality/grubpac/logs/dropdowns
		const dropdownsRes = await app.request("/api/v1/hospitality/grubpac/logs/dropdowns", {
			method: "GET",
			headers: {
				"Authorization": "Bearer mock_token_value"
			}
		});
		
		expect(dropdownsRes.status).toBe(200);
		const dropdownsJson = await dropdownsRes.json();
		console.log("\n==================================================");
		console.log("--- MOCK RESPONSE: GET /grubpac/logs/dropdowns ---");
		console.log(JSON.stringify(dropdownsJson, null, 4));
		console.log("==================================================\n");

		// 2. Test POST /api/v1/hospitality/grubpac/logs
		const logsRes = await app.request("/api/v1/hospitality/grubpac/logs", {
			method: "POST",
			headers: {
				"Authorization": "Bearer mock_token_value",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				filters: [
					{
						category: "GrubPac",
						types: ["Box status", "Suspension"]
					}
				],
				page: 1,
				limit: 10
			})
		});

		expect(logsRes.status).toBe(200);
		const logsJson = await logsRes.json();
		console.log("\n==================================================");
		console.log("--- MOCK RESPONSE: POST /grubpac/logs ---");
		console.log(JSON.stringify(logsJson, null, 4));
		console.log("==================================================\n");

		// Cleanup spies and restore global Prisma
		verifySpy.mockRestore();
		getSystemLogsSpy.mockRestore();
		(globalThis as any).prisma = originalPrisma;
	});
});
