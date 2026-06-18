import { describe, expect, test } from "bun:test";
import { z } from "zod";

// Filename parsing logic replication for testing
function parseOriginalFilename(pathParam: string): string {
	const baseName = pathParam.split("/").pop() || pathParam;
	let originalFilename = baseName;
	if (/^[A-Za-z0-9]{26}-/.test(baseName)) {
		originalFilename = baseName.substring(27);
	}
	return originalFilename;
}

// Query validator schema replication for testing
const downloadQuerySchema = z.object({
	path: z.string({
		error: "Please provide a valid path",
	}).min(1, "Please provide a valid path"),
});

describe("FAQ Attachment Download Schema & Helpers", () => {
	describe("Query validator schema", () => {
		test("accepts valid non-empty path parameter", () => {
			const result = downloadQuerySchema.safeParse({
				path: "faq/01KV2PC70FD1V0AEWD1KARJ1PW-system_logs.csv",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.path).toBe("faq/01KV2PC70FD1V0AEWD1KARJ1PW-system_logs.csv");
			}
		});

		test("rejects missing path parameter", () => {
			const result = downloadQuerySchema.safeParse({});
			expect(result.success).toBe(false);
		});

		test("rejects empty path parameter", () => {
			const result = downloadQuerySchema.safeParse({ path: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("Filename parser logic", () => {
		test("removes Crockford ULID prefix and hyphen", () => {
			const pathParam = "faq/01KV2PC70FD1V0AEWD1KARJ1PW-system_logs_2026-06-13__6_.csv";
			const result = parseOriginalFilename(pathParam);
			expect(result).toBe("system_logs_2026-06-13__6_.csv");
		});

		test("keeps full name if no valid ULID prefix is found", () => {
			const pathParam = "faq/simple_file.csv";
			const result = parseOriginalFilename(pathParam);
			expect(result).toBe("simple_file.csv");
		});

		test("handles filenames with multiple hyphens", () => {
			const pathParam = "faq/01KV2PC70FD1V0AEWD1KARJ1PW-my-test-file-name.csv";
			const result = parseOriginalFilename(pathParam);
			expect(result).toBe("my-test-file-name.csv");
		});
	});
});
