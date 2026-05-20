import { describe, expect, test } from "bun:test";

// ---------------------------------------------------------------------------
// Validator unit tests – pure Zod schema tests, no mocking needed
// ---------------------------------------------------------------------------

// Replicate the Zod schema from box.validators.ts for isolated testing
import { z } from "zod";

const createBoxSchema = z.object({
	box_id: z.string().trim().min(1, "Box ID cannot be empty"),
	name: z.string().trim().min(1).max(30).optional(),
	vertical: z.ulid({ error: "Please provide a valid vertical id (ULID format expected, e.g. 01KBQDHRG48S8MTJ3JWS1E00PD)" }),
	vehicle_number: z.string().trim().optional().nullable(),
	status: z
		.union(
			[z.literal("active"), z.literal("suspended")],
			{ error: "Status must be 'active' or 'suspended'" },
		)
		.optional()
		.default("active"),
	power_status: z.string().trim().optional().nullable(),
	health_status: z.string().trim().optional().nullable(),
	ioniser_status: z.string().trim().optional().nullable(),
	battery_percentage: z.coerce
		.number({ error: "Battery percentage must be a number" })
		.int("Battery percentage must be an integer between 0 and 100")
		.min(0, "Battery percentage must be between 0 and 100")
		.max(100, "Battery percentage must be between 0 and 100")
		.optional()
		.nullable(),
});

describe("Box creation schema validation", () => {
	// ---- Successful creation --------------------------------------------------

	test("accepts valid payload with active status", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-001",
			name: "Main Kitchen Box A",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			vehicle_number: "MH-01-AB-1234",
			status: "active",
			power_status: "on",
			health_status: "healthy",
			ioniser_status: "on",
			battery_percentage: 85,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("active");
			expect(result.data.box_id).toBe("GP-BOX-001");
		}
	});

	test("accepts valid payload with suspended status", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-002",
			name: "Secondary Box",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			status: "suspended",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("suspended");
		}
	});

	test("defaults status to active when omitted", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-003",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.status).toBe("active");
		}
	});

	test("accepts minimal payload (only required fields)", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-004",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
	});

	test("accepts null for nullable fields", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-005",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			vehicle_number: null,
			power_status: null,
			health_status: null,
			ioniser_status: null,
			battery_percentage: null,
		});
		expect(result.success).toBe(true);
	});

	// ---- Vertical ID validation ------------------------------------------------

	test("rejects old MongoDB ObjectId format for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-006",
			vertical: "60d21b4667d0d8992e610c90",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const msg = result.error.issues[0]?.message ?? "";
			expect(msg).toContain("vertical id");
		}
	});

	test("rejects empty string for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-007",
			vertical: "",
		});
		expect(result.success).toBe(false);
	});

	test("rejects missing vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-008",
		});
		expect(result.success).toBe(false);
	});

	test("rejects non-existent ULID format for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-009",
			vertical: "not-a-ulid-at-all",
		});
		expect(result.success).toBe(false);
	});

	// ---- Status validation -----------------------------------------------------

	test("rejects invalid status value", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-010",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			status: "inactive",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const msg = result.error.issues[0]?.message ?? "";
			expect(msg).toContain("Status must be");
		}
	});

	// ---- Box ID validation -----------------------------------------------------

	test("rejects empty box_id", () => {
		const result = createBoxSchema.safeParse({
			box_id: "",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(false);
	});

	test("rejects missing box_id", () => {
		const result = createBoxSchema.safeParse({
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(false);
	});

	// ---- Battery percentage validation -----------------------------------------

	test("rejects battery_percentage below 0", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-011",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: -5,
		});
		expect(result.success).toBe(false);
	});

	test("rejects battery_percentage above 100", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-012",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 150,
		});
		expect(result.success).toBe(false);
	});

	test("rejects battery_percentage as non-integer", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-013",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 50.5,
		});
		expect(result.success).toBe(false);
	});

	test("coerces string battery_percentage to number", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-014",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: "75",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.battery_percentage).toBe(75);
		}
	});

	test("accepts battery_percentage at boundary values 0 and 100", () => {
		const r1 = createBoxSchema.safeParse({
			box_id: "GP-BOX-015",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 0,
		});
		expect(r1.success).toBe(true);

		const r2 = createBoxSchema.safeParse({
			box_id: "GP-BOX-016",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 100,
		});
		expect(r2.success).toBe(true);
	});

	// ---- Name validation -------------------------------------------------------

	test("rejects name longer than 30 characters", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-017",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			name: "a".repeat(31),
		});
		expect(result.success).toBe(false);
	});

	test("trims box_id whitespace", () => {
		const result = createBoxSchema.safeParse({
			box_id: "  GP-BOX-018  ",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.box_id).toBe("GP-BOX-018");
		}
	});
});
