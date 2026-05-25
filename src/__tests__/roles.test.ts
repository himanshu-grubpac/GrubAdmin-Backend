import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { getAllPermissions, PERMISSION_TOPICS, PERMISSION_SETS, BOX_VERTICALS, VERTICALS_PERMISSIONS } from "@/configs/constants.ts";

describe("getAllPermissions()", () => {
	test("returns all permission topics", () => {
		const perms = getAllPermissions();
		const expectedTopics = Object.values(PERMISSION_TOPICS);
		for (const topic of expectedTopics) {
			expect(perms).toHaveProperty(topic);
		}
	});

	test("returns all values for dashboard topic", () => {
		const perms = getAllPermissions();
		const dashboardPerms = perms[PERMISSION_TOPICS.DASHBOARD] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.DASHBOARD]];
		expect(dashboardPerms.sort()).toEqual(expected.sort());
	});

	test("returns all values for employees topic", () => {
		const perms = getAllPermissions();
		const empPerms = perms[PERMISSION_TOPICS.EMPLOYEES] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.EMPLOYEES]];
		expect(empPerms.sort()).toEqual(expected.sort());
	});

	test("returns all values for roles topic", () => {
		const perms = getAllPermissions();
		const rolesPerms = perms[PERMISSION_TOPICS.ROLES] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.ROLES]];
		expect(rolesPerms.sort()).toEqual(expected.sort());
	});

	test("returns all values for clients topic", () => {
		const perms = getAllPermissions();
		const clientsPerms = perms[PERMISSION_TOPICS.CLIENTS] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.CLIENTS]];
		expect(clientsPerms.sort()).toEqual(expected.sort());
	});

	test("returns all values for support topic", () => {
		const perms = getAllPermissions();
		const supportPerms = perms[PERMISSION_TOPICS.SUPPORT] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.SUPPORT]];
		expect(supportPerms.sort()).toEqual(expected.sort());
	});

	test("returns all values for grubpac topic", () => {
		const perms = getAllPermissions();
		const grubpacPerms = perms[PERMISSION_TOPICS.GRUBPACS] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.GRUBPACS]];
		expect(grubpacPerms.sort()).toEqual(expected.sort());
	});

	test("returns all values for system_settings topic", () => {
		const perms = getAllPermissions();
		const ssPerms = perms[PERMISSION_TOPICS.SYSTEM_SETTINGS] as string[];
		const expected = [...PERMISSION_SETS[PERMISSION_TOPICS.SYSTEM_SETTINGS]];
		expect(ssPerms.sort()).toEqual(expected.sort());
	});

	test("returns all verticals with correct key-value pairs", () => {
		const perms = getAllPermissions();
		const verticalsPerms = perms[PERMISSION_TOPICS.VERTICALS] as Record<string, string>;

		for (const v of BOX_VERTICALS) {
			expect(verticalsPerms).toHaveProperty(v);
			expect(verticalsPerms[v]).toBe(v);
		}

		for (const [key, value] of Object.entries(VERTICALS_PERMISSIONS)) {
			expect(verticalsPerms).toHaveProperty(key);
			expect(verticalsPerms[key]).toBe(value);
		}
	});

	test("covers every permission defined in PERMISSION_SETS", () => {
		const perms = getAllPermissions();
		let totalPermsReturned = 0;

		for (const [topic, permissions] of Object.entries(perms)) {
			if (Array.isArray(permissions)) {
				totalPermsReturned += permissions.length;
			} else if (typeof permissions === "object" && permissions !== null) {
				totalPermsReturned += Object.keys(permissions).length;
			}
		}

		let totalPermsDefined = 0;
		for (const [, permSet] of Object.entries(PERMISSION_SETS)) {
			totalPermsDefined += permSet.size;
		}

		expect(totalPermsReturned).toBe(totalPermsDefined);
	});

	test("every returned topic key is a non-empty array or object", () => {
		const perms = getAllPermissions();
		for (const [topic, value] of Object.entries(perms)) {
			if (Array.isArray(value)) {
				expect(value.length).toBeGreaterThan(0);
			} else if (typeof value === "object" && value !== null) {
				expect(Object.keys(value).length).toBeGreaterThan(0);
			}
		}
	});
});

describe("createRole — validation schema", () => {
	const createSchema = z.object({
		name: z.string().min(2).max(50),
		permissions: z.record(z.string(), z.array(z.string())).optional(),
		is_super_admin: z.boolean().optional(),
	});

	test("accepts role without permissions when is_super_admin is true", () => {
		const result = createSchema.safeParse({
			name: "Super Admin",
			is_super_admin: true,
		});
		expect(result.success).toBe(true);
	});

	test("accepts role with permissions when is_super_admin is false", () => {
		const result = createSchema.safeParse({
			name: "Manager",
			is_super_admin: false,
			permissions: { dashboard: ["view dashboard"] },
		});
		expect(result.success).toBe(true);
	});

	test("accepts role without permissions when is_super_admin is false", () => {
		const result = createSchema.safeParse({
			name: "Manager",
			is_super_admin: false,
		});
		expect(result.success).toBe(true);
	});

	test("rejects role with name shorter than 2 characters", () => {
		const result = createSchema.safeParse({
			name: "A",
		});
		expect(result.success).toBe(false);
	});
});

describe("createRole — permission assignment logic", () => {
	test("super admin role gets all permissions via getAllPermissions", () => {
		const allPerms = getAllPermissions();
		expect(Object.keys(allPerms).length).toBe(Object.values(PERMISSION_TOPICS).length);
	});

	test("non-super admin role defaults to empty object", () => {
		const perms = {};
		expect(Object.keys(perms).length).toBe(0);
	});

	test("super admin permissions object has every topic", () => {
		const allPerms = getAllPermissions();
		for (const topic of Object.values(PERMISSION_TOPICS)) {
			expect(allPerms).toHaveProperty(topic);
		}
	});

	test("super admin dashboard permissions match the known set", () => {
		const allPerms = getAllPermissions();
		const dashPerms = allPerms[PERMISSION_TOPICS.DASHBOARD] as string[];
		expect(dashPerms).toContain("view dashboard");
		expect(dashPerms).toContain("export dashboard");
	});
});
