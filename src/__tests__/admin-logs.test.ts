import { describe, expect, test } from "bun:test";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Replicate the relevant parts of getAdminLogsRequestQueryValidators
// to test subject_id acceptance and transformation.
// ---------------------------------------------------------------------------

const getAdminLogsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).optional(),
	page_number: z.coerce.number().int().min(1).default(1),
	page_size: z.coerce.number().int().min(1).default(10),
	search: z.string().trim().optional(),
	category: z.union([
		z.enum(["Restaurant", "Employee", "GrubPac", "GrubLock", "Profile"]),
		z.array(z.enum(["Restaurant", "Employee", "GrubPac", "GrubLock", "Profile"])),
	]).optional(),
	type: z.union([
		z.enum(["Creation", "Deletion", "Suspension", "Activation", "Updation", "Reassignment", "Connection", "Status", "Emergency", "Ownership", "Access"]),
		z.array(z.enum(["Creation", "Deletion", "Suspension", "Activation", "Updation", "Reassignment", "Connection", "Status", "Emergency", "Ownership", "Access"])),
	]).optional(),
	admin_id: z.string().optional(),
	subject_id: z.string().optional(),
	start_date: z.string().optional().transform((v) => v ? new Date(v) : undefined),
	end_date: z.string().optional().transform((v) => {
		if (!v) return undefined;
		const date = new Date(v);
		if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
			date.setUTCHours(23, 59, 59, 999);
		}
		return date;
	}),
});

// ---------------------------------------------------------------------------
// GetSystemLogsArgs builder — replicate the handler's mapping logic
// ---------------------------------------------------------------------------
function buildGetSystemLogsArgs(parsed: Record<string, unknown>) {
	return {
		category: parsed.category as any,
		type: parsed.type as any,
		search: parsed.search as string | undefined,
		page: (parsed.page ?? parsed.page_number) as number,
		page_size: (parsed.limit ?? parsed.page_size) as number,
		start_date: parsed.start_date as Date | undefined,
		end_date: parsed.end_date as Date | undefined,
		actor_id: parsed.admin_id as string | undefined,
		subject_id: parsed.subject_id as string | undefined,
	};
}

// ---------------------------------------------------------------------------
// Replicate the filter-building logic from getSystemLogs
// ---------------------------------------------------------------------------
function buildSystemLogsFilter(args: {
	actor_id?: string;
	subject_id?: string;
	category?: unknown;
	type?: unknown;
	search?: string;
	start_date?: Date;
	end_date?: Date;
}) {
	const filter: Record<string, any> = {};
	const andConditions: Record<string, any>[] = [];

	if (args.category) {
		filter.category = args.category;
	}
	if (args.type) {
		filter.type = args.type;
	}

	if (args.actor_id) {
		andConditions.push({
			$or: [
				{ "actor.id": args.actor_id },
				{ admin_id: args.actor_id },
			],
		});
	}

	if (args.subject_id) {
		andConditions.push({
			$or: [
				{ "subject.id": args.subject_id },
				{ effected_id: args.subject_id },
			],
		});
	}

	if (args.search) {
		const escaped = args.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		andConditions.push({
			$or: [
				{ description: { $regex: escaped, $options: "i" } },
				{ type: { $regex: escaped, $options: "i" } },
				{ category: { $regex: escaped, $options: "i" } },
				{ "actor.name": { $regex: escaped, $options: "i" } },
				{ "actor.ip": { $regex: escaped, $options: "i" } },
				{ "subject.name": { $regex: escaped, $options: "i" } },
			],
		});
	}

	if (args.start_date || args.end_date) {
		const dateFilter: Record<string, unknown> = {};
		if (args.start_date) dateFilter.$gte = args.start_date;
		if (args.end_date) dateFilter.$lte = args.end_date;
		andConditions.push({ createdAt: dateFilter });
	}

	if (andConditions.length > 0) {
		filter.$and = andConditions;
	}

	return filter;
}

// ===========================================================================
// Tests
// ===========================================================================

describe("Admin logs — Zod query schema", () => {
	test("accepts subject_id parameter", () => {
		const result = getAdminLogsQuerySchema.safeParse({
			subject_id: "01J8ORIGINAL_ADMIN_ID",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subject_id).toBe("01J8ORIGINAL_ADMIN_ID");
		}
	});

	test("accepts admin_id parameter", () => {
		const result = getAdminLogsQuerySchema.safeParse({
			admin_id: "01J8ADMIN_ID",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.admin_id).toBe("01J8ADMIN_ID");
		}
	});

	test("accepts both admin_id and subject_id together", () => {
		const result = getAdminLogsQuerySchema.safeParse({
			admin_id: "01J8ACTOR",
			subject_id: "01J8SUBJECT",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.admin_id).toBe("01J8ACTOR");
			expect(result.data.subject_id).toBe("01J8SUBJECT");
		}
	});

	test("subject_id is optional — omitting it is valid", () => {
		const result = getAdminLogsQuerySchema.safeParse({
			admin_id: "01J8ACTOR",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subject_id).toBeUndefined();
		}
	});

	test("rejects invalid enum for category", () => {
		const result = getAdminLogsQuerySchema.safeParse({
			category: "InvalidCategory",
		});
		expect(result.success).toBe(false);
	});

	test("coerces page from string", () => {
		const result = getAdminLogsQuerySchema.safeParse({
			page: "3",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.page).toBe(3);
	});
});

describe("Admin logs — handler mapping to getSystemLogs args", () => {
	test("maps admin_id to actor_id", () => {
		const parsed = getAdminLogsQuerySchema.parse({
			admin_id: "01J8ADMIN",
			subject_id: "01J8SUBJECT",
		});
		const args = buildGetSystemLogsArgs(parsed);
		expect(args.actor_id).toBe("01J8ADMIN");
		expect(args.subject_id).toBe("01J8SUBJECT");
	});

	test("maps page_number to page when page is absent", () => {
		const parsed = getAdminLogsQuerySchema.parse({
			page_number: 5,
			page_size: 25,
		});
		const args = buildGetSystemLogsArgs(parsed);
		expect(args.page).toBe(5);
		expect(args.page_size).toBe(25);
	});

	test("prefers page over page_number", () => {
		const parsed = getAdminLogsQuerySchema.parse({
			page: 2,
			page_number: 5,
		});
		const args = buildGetSystemLogsArgs(parsed);
		expect(args.page).toBe(2);
	});

	test("prefers limit over page_size", () => {
		const parsed = getAdminLogsQuerySchema.parse({
			limit: 50,
			page_size: 25,
		});
		const args = buildGetSystemLogsArgs(parsed);
		expect(args.page_size).toBe(50);
	});

	test("transforms start_date string to Date", () => {
		const parsed = getAdminLogsQuerySchema.parse({
			start_date: "2025-06-01",
		});
		expect(parsed.start_date).toBeInstanceOf(Date);
	});

	test("transforms end_date with YYYY-MM-DD to end-of-day", () => {
		const parsed = getAdminLogsQuerySchema.parse({
			end_date: "2025-12-31",
		});
		expect(parsed.end_date).toBeInstanceOf(Date);
		if (parsed.end_date) {
			expect(parsed.end_date.getUTCHours()).toBe(23);
			expect(parsed.end_date.getUTCMinutes()).toBe(59);
			expect(parsed.end_date.getUTCSeconds()).toBe(59);
		}
	});
});

describe("getSystemLogs — MongoDB filter construction", () => {
	test("builds filter with actor_id only", () => {
		const filter = buildSystemLogsFilter({ actor_id: "01J8ACTOR" });
		expect(filter.$and).toHaveLength(1);
		expect(filter.$and[0]).toEqual({
			$or: [
				{ "actor.id": "01J8ACTOR" },
				{ admin_id: "01J8ACTOR" },
			],
		});
	});

	test("builds filter with subject_id only", () => {
		const filter = buildSystemLogsFilter({ subject_id: "01J8SUBJECT" });
		expect(filter.$and).toHaveLength(1);
		expect(filter.$and[0]).toEqual({
			$or: [
				{ "subject.id": "01J8SUBJECT" },
				{ effected_id: "01J8SUBJECT" },
			],
		});
	});

	test("builds filter with both actor_id and subject_id", () => {
		const filter = buildSystemLogsFilter({
			actor_id: "01J8ACTOR",
			subject_id: "01J8SUBJECT",
		});
		expect(filter.$and).toHaveLength(2);
		expect(filter.$and[0]).toEqual({
			$or: [
				{ "actor.id": "01J8ACTOR" },
				{ admin_id: "01J8ACTOR" },
			],
		});
		expect(filter.$and[1]).toEqual({
			$or: [
				{ "subject.id": "01J8SUBJECT" },
				{ effected_id: "01J8SUBJECT" },
			],
		});
	});

	test("adds search regex condition", () => {
		const filter = buildSystemLogsFilter({ search: "John" });
		expect(filter.$and).toHaveLength(1);
		expect(filter.$and[0].$or).toBeDefined();
		expect(filter.$and[0].$or.length).toBeGreaterThanOrEqual(6);
		expect(filter.$and[0].$or[0].description.$regex).toBe("John");
	});

	test("escapes regex special characters in search", () => {
		const filter = buildSystemLogsFilter({ search: "John (Doe)" });
		const regexStr = filter.$and[0].$or[0].description.$regex as string;
		expect(regexStr).toBe("John \\(Doe\\)");
	});

	test("adds date range condition", () => {
		const start = new Date("2025-01-01");
		const end = new Date("2025-12-31T23:59:59.999Z");
		const filter = buildSystemLogsFilter({ start_date: start, end_date: end });
		expect(filter.$and).toHaveLength(1);
		expect(filter.$and[0].createdAt.$gte).toEqual(start);
		expect(filter.$and[0].createdAt.$lte).toEqual(end);
	});

	test("combines all filter types together", () => {
		const start = new Date("2025-01-01");
		const filter = buildSystemLogsFilter({
			actor_id: "01J8ACTOR",
			subject_id: "01J8SUBJECT",
			search: "test",
			start_date: start,
		});
		expect(filter.$and).toHaveLength(4);
	});

	test("returns empty filter when no conditions provided", () => {
		const filter = buildSystemLogsFilter({});
		expect(filter.$and).toBeUndefined();
	});

	test("includes category and type at top level", () => {
		const filter = buildSystemLogsFilter({
			category: "Employee",
			type: "Creation",
		});
		expect(filter.category).toBe("Employee");
		expect(filter.type).toBe("Creation");
	});
});
