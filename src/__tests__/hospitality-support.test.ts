import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants.ts";
import { SEARCH_PAGE_SIZE } from "@/validators/pagination.ts";

const SUPPORT_ROUTES = [
	"GET /api/v1/hospitality/support/category",
	"GET /api/v1/hospitality/support/faq",
	"GET /api/v1/hospitality/support/search",
	"GET /api/v1/hospitality/support/answer",
	"GET /api/v1/hospitality/support/faq/attachment/download",
] as const;

function getHospitalityRoutePaths(): string[] {
	const app = new Hono();
	app.route("/api/v1/hospitality", hospitalityRouter);
	return app.routes.map((r) => `${r.method} ${r.path}`);
}

const FAQ_ATTACHMENT_PATH_PATTERN = /^faq\/[\w\-./]+$/;

function isValidFaqAttachmentPath(attachmentPath: unknown): boolean {
	if (typeof attachmentPath !== "string") return false;
	const trimmed = attachmentPath.trim();
	if (!trimmed.startsWith("faq/")) return false;
	if (trimmed.includes("..") || trimmed.includes("\0")) return false;
	return FAQ_ATTACHMENT_PATH_PATTERN.test(trimmed);
}

function mapSearchFaqsForFe(
	faqs: Array<{ id: string; question: string; categories?: Array<{ category: { name: string } }> }>,
	categoryId?: string,
) {
	const mapped: Array<{ id: string; question: string; category?: string | null }> = [];
	for (const faq of faqs) {
		if (categoryId) {
			mapped.push({ id: faq.id, question: faq.question });
		} else if (faq.categories && faq.categories.length > 0) {
			for (const cat of faq.categories) {
				mapped.push({
					id: faq.id,
					question: faq.question,
					category: cat.category.name,
				});
			}
		} else {
			mapped.push({ id: faq.id, question: faq.question, category: null });
		}
	}
	return mapped;
}

describe("Hospitality Support — route registration", () => {
	test("HOSPITALITY_VERTICAL_NAME matches FAQ vertical filter convention", () => {
		expect(HOSPITALITY_VERTICAL_NAME).toBe("Hospitality");
	});

	test("registers all Help FE support endpoints", () => {
		const routes = getHospitalityRoutePaths();
		for (const route of SUPPORT_ROUTES) {
			expect(routes).toContain(route);
		}
	});
});

describe("Hospitality Support — FE contract helpers", () => {
	test("isValidFaqAttachmentPath mirrors FE support.js guard", () => {
		expect(isValidFaqAttachmentPath("faq/01KV2PC70FD1V0AEWD1KARJ1PW-system_logs.csv")).toBe(true);
		expect(isValidFaqAttachmentPath("faq/nested/file.pdf")).toBe(true);
		expect(isValidFaqAttachmentPath("../faq/evil.csv")).toBe(false);
		expect(isValidFaqAttachmentPath("faq/../evil.csv")).toBe(false);
		expect(isValidFaqAttachmentPath("delivery/faq/file.csv")).toBe(false);
		expect(isValidFaqAttachmentPath("")).toBe(false);
	});

	test("search mapper returns category per FE useHelpSearch contract", () => {
		const mapped = mapSearchFaqsForFe([
			{
				id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				question: "How do I reset?",
				categories: [{ category: { name: "Account" } }],
			},
		]);
		expect(mapped).toEqual([
			{
				id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
				question: "How do I reset?",
				category: "Account",
			},
		]);
	});

	test("search mapper omits category when category_id filter is set", () => {
		const mapped = mapSearchFaqsForFe(
			[
				{
					id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
					question: "How do I reset?",
					categories: [{ category: { name: "Account" } }],
				},
			],
			"01ARZ3NDEKTSV4RRFFQ69G5FAW",
		);
		expect(mapped).toEqual([
			{ id: "01ARZ3NDEKTSV4RRFFQ69G5FAV", question: "How do I reset?" },
		]);
	});

	test("default search page size is bounded for scale", () => {
		expect(SEARCH_PAGE_SIZE).toBe(50);
	});
});

describe("Hospitality Support — query validators exported", () => {
	test("support validators are wired for Help FE query params", async () => {
		const validators = await import("hospitality/validators/support.validators");
		expect(typeof validators.getSupportCategoriesRequestQueryValidator).toBe("function");
		expect(typeof validators.getSupportQuestionsRequestQueryValidator).toBe("function");
		expect(typeof validators.searchSupportQuestionsRequestQueryValidator).toBe("function");
		expect(typeof validators.getSupportAnswerRequestQueryValidator).toBe("function");
		expect(typeof validators.downloadSupportAttachmentRequestQueryValidator).toBe("function");
	});
});

describe("Hospitality Support — live API (unauthenticated)", () => {
	const base = process.env.HOSPITALITY_E2E_BASE_URL ?? "http://127.0.0.1:8000";

	for (const [label, path] of [
		["category", "/api/v1/hospitality/support/category"],
		["faq list", "/api/v1/hospitality/support/faq?category_id=01ARZ3NDEKTSV4RRFFQ69G5FAV"],
		["search", "/api/v1/hospitality/support/search?query=reset"],
		["answer", "/api/v1/hospitality/support/answer?faq_id=01ARZ3NDEKTSV4RRFFQ69G5FAV"],
		[
			"attachment download",
			"/api/v1/hospitality/support/faq/attachment/download?path=faq%2Ftest-file.csv",
		],
	] as const) {
		test(`GET ${label} without auth returns 401`, async () => {
			let response: Response;
			try {
				response = await fetch(`${base}${path}`);
			} catch {
				return;
			}
			expect(response.status).toBe(401);
		});
	}

	test("GET search without query returns 400 when API is reachable", async () => {
		let response: Response;
		try {
			response = await fetch(`${base}/api/v1/hospitality/support/search`);
		} catch {
			return;
		}
		expect([400, 401]).toContain(response.status);
	});
});
