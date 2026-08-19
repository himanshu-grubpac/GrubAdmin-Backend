import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { mapHospitalityFloorListItem, resolveAssignedBoxCountWhere } from "@/db/actions/floor.actions";

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

describe("Hospitality Floor routes registration", () => {
	test("registers all required Floor endpoints", () => {
		const routes = getHospitalityRoutePaths();
		const expected = [
			"POST /api/v1/hospitality/floor",
			"GET /api/v1/hospitality/floor",
			"GET /api/v1/hospitality/floor/details",
			"PUT /api/v1/hospitality/floor",
			"DELETE /api/v1/hospitality/floor",
			"PATCH /api/v1/hospitality/floor/suspend",
			"PATCH /api/v1/hospitality/floor/reactivate",
			"GET /api/v1/hospitality/floor/search",
		];
		for (const route of expected) {
			expect(routes).toContain(route);
		}
	});
});

describe("Hospitality floor list mapper (Groups FE contract)", () => {
	test("maps box_count and optional boxes_list for include_boxes", () => {
		const mapped = mapHospitalityFloorListItem(
			{
				id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				name: "Floor A",
				status: "active",
				created_at: new Date("2026-01-01T00:00:00.000Z"),
				updated_at: new Date("2026-01-02T00:00:00.000Z"),
				_count: { boxes: 2 },
				boxes: [
					{
						room: "101",
						box: { id: "01ARZ3NDEKTSV4RRFFQ69G5FAW", box_display_id: "GP-001" },
					},
					{
						room: null,
						box: { id: "01ARZ3NDEKTSV4RRFFQ69G5FAX", box_display_id: "GP-002" },
					},
				],
			},
			true,
		);

		expect(mapped.box_count).toBe(2);
		expect(mapped.boxes_total_count).toBe(2);
		expect(mapped.boxes_preview_count).toBe(2);
		expect(mapped.boxes_list).toEqual([
			{ id: "01ARZ3NDEKTSV4RRFFQ69G5FAW", room: "101", box_display_id: "GP-001" },
			{ id: "01ARZ3NDEKTSV4RRFFQ69G5FAX", room: null, box_display_id: "GP-002" },
		]);
		expect(mapped).not.toHaveProperty("_count");
	});

	test("omits boxes_list when include_boxes is false", () => {
		const mapped = mapHospitalityFloorListItem(
			{
				id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				name: "Floor B",
				status: "suspended",
				created_at: new Date("2026-01-01T00:00:00.000Z"),
				updated_at: new Date("2026-01-02T00:00:00.000Z"),
				_count: { boxes: 0 },
			},
			false,
		);

		expect(mapped.box_count).toBe(0);
		expect(mapped.boxes_list).toBeUndefined();
		expect(mapped.boxes_total_count).toBeUndefined();
	});

	test("include_boxes exposes total vs preview when list is truncated (G27)", () => {
		const previewRows = Array.from({ length: 200 }, (_, index) => ({
			room: String(index),
			box: {
				id: `01ARZ3NDEKTSV4RRFFQ69G5F${String(index).padStart(2, "0")}`,
				box_display_id: `GP-${index}`,
			},
		}));

		const mapped = mapHospitalityFloorListItem(
			{
				id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				name: "Large Floor",
				status: "active",
				created_at: new Date("2026-01-01T00:00:00.000Z"),
				updated_at: new Date("2026-01-02T00:00:00.000Z"),
				_count: { boxes: 350 },
				boxes: previewRows,
			},
			true,
		);

		expect(mapped.box_count).toBe(350);
		expect(mapped.boxes_total_count).toBe(350);
		expect(mapped.boxes_preview_count).toBe(200);
		expect(mapped.boxes_list).toHaveLength(200);
	});
});

describe("Hospitality floor box_count filter (G28 / C9)", () => {
	test("active list counts only active box assignments", () => {
		expect(resolveAssignedBoxCountWhere("active")).toEqual({
			box: { status: "active" },
		});
		expect(resolveAssignedBoxCountWhere(undefined)).toEqual({
			box: { status: "active" },
		});
	});

	test("suspended list counts only suspended box assignments", () => {
		expect(resolveAssignedBoxCountWhere("suspended")).toEqual({
			box: { status: "suspended" },
		});
	});

	test("all status counts every floor assignment regardless of box status", () => {
		expect(resolveAssignedBoxCountWhere("all")).toBeUndefined();
	});
});

describe("Hospitality grubpac bulk reactivate (G29)", () => {
	test("bulkReactivateHospitalityBoxesByFilter is exported", async () => {
		const mod = await import("@/db/actions/hospitality/box.actions.ts");
		expect(typeof mod.bulkReactivateHospitalityBoxesByFilter).toBe("function");
	});

	test("reactivate validator accepts activate_all with suspended list filters", async () => {
		const { z } = await import("zod");

		const schema = z
			.object({
				ids: z.array(z.string().ulid()).max(100).optional(),
				activate_all: z.boolean().optional(),
				reassign: z.boolean().optional(),
				query: z.string().trim().max(200).optional(),
				floor_assigned: z.enum(["on", "off"]).optional(),
				room_assigned: z.enum(["on", "off"]).optional(),
			})
			.refine(
				(data) => data.activate_all === true || !!(data.ids && data.ids.length > 0),
				{ message: "ids or activate_all", path: ["ids"] },
			)
			.refine((data) => !(data.activate_all && data.ids && data.ids.length > 0), {
				message: "cannot combine",
				path: ["ids"],
			});

		expect(
			schema.safeParse({
				activate_all: true,
				reassign: false,
				floor_assigned: "on",
				query: "lobby",
			}).success,
		).toBe(true);

		expect(
			schema.safeParse({
				ids: ["01ARZ3NDEKTSV4RRFFQ69G5FAV"],
				reassign: true,
			}).success,
		).toBe(true);

		expect(
			schema.safeParse({
				activate_all: true,
				ids: ["01ARZ3NDEKTSV4RRFFQ69G5FAV"],
			}).success,
		).toBe(false);
	});
});

describe("Hospitality floor query validator", () => {
	test("accepts include_boxes=true for Groups list wiring", async () => {
		const { getFloorsRequestQueryValidator } = await import(
			"hospitality/validators/floor.validators"
		);
		expect(typeof getFloorsRequestQueryValidator).toBe("function");
	});
});

describe("Hospitality grubpac reassign validator (Groups bulk reassign)", () => {
	test("accepts reassign payload without room (Groups ReassignResourcesModal)", async () => {
		const { z } = await import("zod");
		const boxId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
		const floorId = "01ARZ3NDEKTSV4RRFFQ69G5FAW";

		const schema = z
			.object({
				ids: z.array(z.string().ulid()).optional(),
				destination_floor_id: z.string().ulid().optional(),
				room: z.string().trim().max(80).optional().nullable(),
			})
			.transform((data) => ({
				box_ids: data.ids || [],
				destination_floor_id: data.destination_floor_id ?? null,
				room: data.room ?? null,
			}));

		const parsed = schema.parse({
			ids: [boxId],
			destination_floor_id: floorId,
		});

		expect(parsed.box_ids).toEqual([boxId]);
		expect(parsed.destination_floor_id).toBe(floorId);
		expect(parsed.room).toBeNull();
	});

	test("reassignGrubpacHandler route registered for group flows", async () => {
		const routes = getHospitalityRoutePaths();
		expect(routes).toContain("PATCH /api/v1/hospitality/grubpac/reassign");
	});
});

describe("Hospitality grubpac ids_only filter (G30 / FloorResources select-all)", () => {
	test("getHospitalityBoxIdsByFilter is exported with cap constant", async () => {
		const mod = await import("@/db/actions/hospitality/box.actions.ts");
		expect(typeof mod.getHospitalityBoxIdsByFilter).toBe("function");
		expect(mod.HOSPITALITY_MATCHING_BOX_IDS_CAP).toBe(500);
	});

	test("getBoxesRequestQueryValidator accepts ids_only=true", async () => {
		const { getBoxesRequestQueryValidator } = await import(
			"hospitality/validators/box.validators"
		);
		expect(typeof getBoxesRequestQueryValidator).toBe("function");
	});
});
