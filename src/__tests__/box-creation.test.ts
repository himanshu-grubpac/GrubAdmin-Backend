import { describe, expect, test } from "bun:test";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Replicate the EXACT Zod schema from box.validators.ts
// ---------------------------------------------------------------------------
const createBoxSchema = z.object({
	box_id: z.string().trim().min(1, "Box ID cannot be empty"),
	name: z.string().trim().min(1).max(30).optional(),
	vertical: z.ulid({ error: "Please provide a valid vertical id (ULID format expected, e.g. 01KBQDHRG48S8MTJ3JWS1E00PD)" }),
	vehicle_number: z.string().trim().optional().nullable(),
	status: z.string().trim().optional().default("active"),
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

// ---------------------------------------------------------------------------
// Replicate the normalizeStatus logic from create-box.handler.ts
// ---------------------------------------------------------------------------
const VALID_STATUS = ["active", "suspended"] as const;
const VALID_HARDWARE_STATE = ["on", "off", "unknown"] as const;
const VALID_HEALTH_STATUS = ["healthy", "critical", "attention"] as const;

const STATUS_ALIASES: Record<string, string> = { inactive: "suspended" };
const HEALTH_ALIASES: Record<string, string> = { good: "healthy" };

function normalizeStatus(
	val: unknown,
	fieldName: string,
	allowed: readonly string[],
	aliases: Record<string, string> = {},
	defaultVal?: string,
): string | null {
	if (val === undefined || val === null) {
		if (defaultVal !== undefined) return defaultVal;
		return null;
	}
	const str = String(val).toLowerCase().trim();
	const mapped = aliases[str] ?? str;
	if ((allowed as readonly string[]).includes(mapped)) return mapped;
	const allowedStr = allowed.map((v) => `'${v}'`).join(", ");
	throw new Error(`${fieldName} must be one of ${allowedStr}, got '${String(val)}'`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Box creation — Zod schema validation", () => {
	// ---- Active status -------------------------------------------------------

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

	// ---- Inactive / suspended status -----------------------------------------

	test("accepts 'suspended' status", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-002",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			status: "suspended",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.status).toBe("suspended");
	});

	// The Zod layer passes "inactive" through as raw string;
	// the handler normalizes it to "suspended".  We verify the normalization fn.
	test("handler normalizes 'inactive' to 'suspended'", () => {
		const normalized = normalizeStatus("inactive", "Status", VALID_STATUS, STATUS_ALIASES, "active");
		expect(normalized).toBe("suspended");
	});

	// ---- Default status ------------------------------------------------------

	test("defaults status to active when omitted", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-003",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.status).toBe("active");
	});

	// ---- Case insensitivity --------------------------------------------------

	test("accepts uppercase ACTIVE (Zod passes string, handler lowercases)", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-004",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			status: "ACTIVE",
		});
		// Zod accepts any string; handler lowercases it.
		expect(result.success).toBe(true);
	});

	test("handler normalizes 'ACTIVE' to 'active'", () => {
		expect(normalizeStatus("ACTIVE", "Status", VALID_STATUS, STATUS_ALIASES, "active")).toBe("active");
	});

	test("handler normalizes 'INACTIVE' to 'suspended'", () => {
		expect(normalizeStatus("INACTIVE", "Status", VALID_STATUS, STATUS_ALIASES, "active")).toBe("suspended");
	});

	test("handler normalizes 'Suspended' to 'suspended'", () => {
		expect(normalizeStatus("Suspended", "Status", VALID_STATUS, STATUS_ALIASES, "active")).toBe("suspended");
	});

	// ---- Invalid status ------------------------------------------------------

	test("rejects invalid status value and throws descriptive message", () => {
		expect(() =>
			normalizeStatus("random", "Status", VALID_STATUS, STATUS_ALIASES),
		).toThrow("Status must be one of 'active', 'suspended'");
	});

	test("rejects empty string status", () => {
		expect(() =>
			normalizeStatus("", "Status", VALID_STATUS, STATUS_ALIASES),
		).toThrow("Status must be one of 'active', 'suspended'");
	});

	// ---- Vertical ID validation ----------------------------------------------

	test("rejects old MongoDB ObjectId format for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-010",
			vertical: "60d21b4667d0d8992e610c90",
		});
		expect(result.success).toBe(false);
	});

	test("rejects empty string for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-011",
			vertical: "",
		});
		expect(result.success).toBe(false);
	});

	test("rejects missing vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-012",
		});
		expect(result.success).toBe(false);
	});

	test("rejects non-ULID string for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-013",
			vertical: "not-a-valid-ulid",
		});
		expect(result.success).toBe(false);
	});

	test("accepts valid ULID for vertical", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-014",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
	});

	// ---- Box ID validation ---------------------------------------------------

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

	test("trims whitespace from box_id", () => {
		const result = createBoxSchema.safeParse({
			box_id: "  GP-BOX-015  ",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.box_id).toBe("GP-BOX-015");
	});

	// ---- Battery percentage --------------------------------------------------

	test("rejects battery_percentage below 0", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-020",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: -5,
		});
		expect(result.success).toBe(false);
	});

	test("rejects battery_percentage above 100", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-021",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 150,
		});
		expect(result.success).toBe(false);
	});

	test("rejects non-integer battery_percentage", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-022",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 50.5,
		});
		expect(result.success).toBe(false);
	});

	test("coerces string battery_percentage to number", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-023",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: "75",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.battery_percentage).toBe(75);
	});

	test("accepts battery_percentage at boundaries 0 and 100", () => {
		const r1 = createBoxSchema.safeParse({
			box_id: "GP-BOX-024",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 0,
		});
		expect(r1.success).toBe(true);

		const r2 = createBoxSchema.safeParse({
			box_id: "GP-BOX-025",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: 100,
		});
		expect(r2.success).toBe(true);
	});

	test("accepts null battery_percentage", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-026",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			battery_percentage: null,
		});
		expect(result.success).toBe(true);
	});

	test("accepts missing battery_percentage", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-027",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
	});

	// ---- Name validation -----------------------------------------------------

	test("rejects name longer than 30 characters", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-030",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			name: "a".repeat(31),
		});
		expect(result.success).toBe(false);
	});

	test("accepts name at exactly 30 characters", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-031",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			name: "a".repeat(30),
		});
		expect(result.success).toBe(true);
	});

	test("accepts missing name", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-032",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
	});

	// ---- Handler normalization — health_status mapping -----------------------

	test("handler normalizes 'good' health_status to 'healthy'", () => {
		const normalized = normalizeStatus("good", "Health status", VALID_HEALTH_STATUS, HEALTH_ALIASES);
		expect(normalized).toBe("healthy");
	});

	test("handler normalizes 'GOOD' health_status to 'healthy'", () => {
		const normalized = normalizeStatus("GOOD", "Health status", VALID_HEALTH_STATUS, HEALTH_ALIASES);
		expect(normalized).toBe("healthy");
	});

	test("handler rejects invalid health_status", () => {
		expect(() =>
			normalizeStatus("bad", "Health status", VALID_HEALTH_STATUS, HEALTH_ALIASES),
		).toThrow("Health status must be one of 'healthy', 'critical', 'attention'");
	});

	// ---- Handler normalization — power/ioniser hardware_state -----------------

	test("handler normalizes 'ON' to 'on'", () => {
		expect(normalizeStatus("ON", "Power status", VALID_HARDWARE_STATE)).toBe("on");
	});

	test("handler normalizes 'Off' to 'off'", () => {
		expect(normalizeStatus("Off", "Power status", VALID_HARDWARE_STATE)).toBe("off");
	});

	test("handler rejects invalid hardware_state", () => {
		expect(() =>
			normalizeStatus("maybe", "Power status", VALID_HARDWARE_STATE),
		).toThrow("Power status must be one of 'on', 'off', 'unknown'");
	});

	// ---- Minimal payload ----------------------------------------------------

	test("accepts minimal payload (only required fields + vertical)", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-040",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
		});
		expect(result.success).toBe(true);
	});

	// ---- Null handling for nullable fields -----------------------------------

	test("accepts null for nullable fields", () => {
		const result = createBoxSchema.safeParse({
			box_id: "GP-BOX-050",
			vertical: "01KBQDHRG48S8MTJ3JWS1E00PD",
			vehicle_number: null,
			power_status: null,
			health_status: null,
			ioniser_status: null,
			battery_percentage: null,
		});
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Full integration test — simulate the handler's end-to-end normalization
// ---------------------------------------------------------------------------
describe("Full handler normalization (status + health + power + ioniser)", () => {
	const validUlid = "01KBQDHRG48S8MTJ3JWS1E00PD";

	function simulateHandler(body: Record<string, unknown>) {
		const parsed = createBoxSchema.parse(body);
		return {
			...parsed,
			status: normalizeStatus(parsed.status, "Status", VALID_STATUS, STATUS_ALIASES, "active"),
			power_status: normalizeStatus(parsed.power_status, "Power status", VALID_HARDWARE_STATE) ?? null,
			health_status: normalizeStatus(parsed.health_status, "Health status", VALID_HEALTH_STATUS, HEALTH_ALIASES) ?? null,
			ioniser_status: normalizeStatus(parsed.ioniser_status, "Ioniser status", VALID_HARDWARE_STATE) ?? null,
		};
	}

	test("Test 1: Create box with active status", () => {
		const result = simulateHandler({
			box_id: "TEST-BOX-ACTIVE",
			name: "Test Active Box",
			vertical: validUlid,
			vehicle_number: "MH-01-AA-1111",
			status: "active",
			power_status: "on",
			health_status: "good",
			ioniser_status: "on",
			battery_percentage: 90,
		});
		expect(result.status).toBe("active");
		expect(result.power_status).toBe("on");
		expect(result.health_status).toBe("healthy");
		expect(result.ioniser_status).toBe("on");
		expect(result.battery_percentage).toBe(90);
	});

	test("Test 2: Create box with inactive status → normalized to suspended", () => {
		const result = simulateHandler({
			box_id: "TEST-BOX-INACTIVE",
			name: "Test Inactive Box",
			vertical: validUlid,
			vehicle_number: "MH-01-AA-2222",
			status: "inactive",
			power_status: "off",
			health_status: "good",
			ioniser_status: "off",
			battery_percentage: 60,
		});
		expect(result.status).toBe("suspended");
		expect(result.power_status).toBe("off");
		expect(result.ioniser_status).toBe("off");
	});

	test("Test 3: Omit status → defaults to active", () => {
		const result = simulateHandler({
			box_id: "TEST-BOX-DEFAULT",
			vertical: validUlid,
		});
		expect(result.status).toBe("active");
	});

	test("Test 4: Invalid status → throws", () => {
		expect(() =>
			simulateHandler({
				box_id: "TEST-BOX-INVALID",
				vertical: validUlid,
				status: "random",
			}),
		).toThrow("Status must be one of 'active', 'suspended'");
	});

	test("Test 5: Uppercase ACTIVE → normalized to active", () => {
		const result = simulateHandler({
			box_id: "TEST-BOX-UPPER",
			vertical: validUlid,
			status: "ACTIVE",
		});
		expect(result.status).toBe("active");
	});

	test("Uppercase INACTIVE → normalized to suspended", () => {
		const result = simulateHandler({
			box_id: "TEST-BOX-UPPER-INACTIVE",
			vertical: validUlid,
			status: "INACTIVE",
		});
		expect(result.status).toBe("suspended");
	});

	test("Suspended status passes through", () => {
		const result = simulateHandler({
			box_id: "TEST-BOX-SUSPENDED",
			vertical: validUlid,
			status: "suspended",
		});
		expect(result.status).toBe("suspended");
	});
});
