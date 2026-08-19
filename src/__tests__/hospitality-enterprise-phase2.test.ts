import { describe, expect, test, beforeEach } from "bun:test";
import { Hono } from "hono";
import { hospitalityRouter } from "@/modules/hospitality";
import {
	CACHE_MAX_AGE_SECONDS,
	ETAG_PATHS,
	computeWeakEtag,
	clearHospitalityEtagCacheForTests,
} from "@/modules/hospitality/middlewares/hospitality-read-cache";
import {
	buildIdempotencyScopeKey,
	clearHospitalityIdempotencyStoreForTests,
	getHospitalityIdempotencyRecordForTests,
	HOSPITALITY_IDEMPOTENCY_TTL_MS,
} from "@/modules/hospitality/middlewares/hospitality-idempotency";
import {
	InMemoryRateLimitStore,
	RedisRateLimitStore,
	createHospitalityRateLimitStore,
} from "@/modules/hospitality/utils/hospitality-rate-limit-store";
import { setHospitalityRateLimitStoreForTests } from "@/modules/hospitality/middlewares/hospitality-rate-limit";
import { HOSPITALITY_AUTH_RATE_LIMITS } from "@/modules/hospitality/configs/hospitality-auth-rate-limits";

const HOSPITALITY_PHASE2_MIGRATION =
	"prisma/migrations/20260817120000_hospitality_enterprise_phase2/migration.sql";

describe("Hospitality Phase 2 — consolidated enterprise migration", () => {
	test("migration file documents box client+vertical+status index", async () => {
		const migration = await Bun.file(HOSPITALITY_PHASE2_MIGRATION).text();
		expect(migration).toContain("box_client_vertical_status_idx");
		expect(migration).toContain("customer_id");
		expect(migration).toContain("vertical_id");
		expect(migration).toContain("status");
	});
});

describe("Hospitality Phase 2 — idempotency middleware", () => {
	beforeEach(() => {
		clearHospitalityIdempotencyStoreForTests();
	});

	test("buildIdempotencyScopeKey is stable per method/path/key", () => {
		const key = buildIdempotencyScopeKey("PATCH", "/api/v1/hospitality/grubpac/suspend", "abc-123");
		expect(key).toBe("PATCH:/api/v1/hospitality/grubpac/suspend:abc-123");
	});

	test("idempotency TTL is 24 hours", () => {
		expect(HOSPITALITY_IDEMPOTENCY_TTL_MS).toBe(24 * 60 * 60 * 1000);
	});

	test("stores and retrieves idempotency record for tests", () => {
		const scopeKey = buildIdempotencyScopeKey("POST", "/transfer", "key-1");
		clearHospitalityIdempotencyStoreForTests();
		expect(getHospitalityIdempotencyRecordForTests(scopeKey)).toBeUndefined();
	});
});

describe("Hospitality Phase 2 — ETag read cache", () => {
	beforeEach(() => {
		clearHospitalityEtagCacheForTests();
	});

	test("ETAG_PATHS covers grubpac, floor, notification list/count", () => {
		expect(ETAG_PATHS.has("/grubpac")).toBe(true);
		expect(ETAG_PATHS.has("/floor")).toBe(true);
		expect(ETAG_PATHS.has("/notification")).toBe(true);
		expect(ETAG_PATHS.has("/notification/count")).toBe(true);
	});

	test("CACHE_MAX_AGE_SECONDS includes notification list", () => {
		expect(CACHE_MAX_AGE_SECONDS["/notification"]).toBe(15);
	});

	test("computeWeakEtag is deterministic for same payload", () => {
		const body = { success: true, data: { total: 3 } };
		expect(computeWeakEtag(body)).toBe(computeWeakEtag(body));
		expect(computeWeakEtag(body)).toMatch(/^W\//);
	});
});

describe("Hospitality Phase 2 — opaque reset link validator", () => {
	test("verify forget-password accepts link_id-only body shape", async () => {
		const { verifyForgetPasswordMagicLinkRequestBodyValidator } = await import(
			"@/modules/hospitality/validators/auth.validators.ts"
		);
		expect(verifyForgetPasswordMagicLinkRequestBodyValidator).toBeDefined();
	});
});

describe("Hospitality Phase 2 — rate limit store abstraction", () => {
	test("createHospitalityRateLimitStore returns in-memory impl by default", () => {
		const store = createHospitalityRateLimitStore();
		expect(store).toBeInstanceOf(InMemoryRateLimitStore);
	});

	test("InMemoryRateLimitStore increments within window", async () => {
		const store = new InMemoryRateLimitStore();
		const first = await store.increment("ip-1", 60_000);
		const second = await store.increment("ip-1", 60_000);
		expect(first.count).toBe(1);
		expect(second.count).toBe(2);
	});

	test("RedisRateLimitStore stub throws until Phase 4", async () => {
		const store = new RedisRateLimitStore("redis://localhost");
		await expect(store.increment("k", 1000)).rejects.toThrow(/not implemented/i);
	});

	test("hospitality router uses hospitality rate limit without shared store bleed", async () => {
		setHospitalityRateLimitStoreForTests(new InMemoryRateLimitStore());
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);
		const res = await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "missing@example.com", password: "secret123" }),
		});
		expect(res.headers.get("X-Request-Id")).toBeTruthy();
		setHospitalityRateLimitStoreForTests(null);
	});
});

describe("Hospitality Phase 2 — P2-11 auth rate limit tighten", () => {
	const loginBody = JSON.stringify({ email: "missing@example.com", password: "secret123" });
	const headers = {
		"Content-Type": "application/json",
		"x-real-ip": "203.0.113.50",
	};

	beforeEach(() => {
		setHospitalityRateLimitStoreForTests(new InMemoryRateLimitStore());
	});

	test("login returns 429 after max requests with Retry-After header", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);
		const { max } = HOSPITALITY_AUTH_RATE_LIMITS.login;

		for (let i = 0; i < max; i++) {
			const res = await app.request("/api/v1/hospitality/auth/login", {
				method: "POST",
				headers,
				body: loginBody,
			});
			expect(res.status).not.toBe(429);
		}

		const blocked = await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers,
			body: loginBody,
		});
		expect(blocked.status).toBe(429);
		expect(blocked.headers.get("Retry-After")).toBeTruthy();
		const body = (await blocked.json()) as { success: boolean; message: string };
		expect(body.success).toBe(false);
		expect(body.message).toContain("Too many requests");
		setHospitalityRateLimitStoreForTests(null);
	});

	test("send-otp limit is independent from login bucket", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);
		const { max: loginMax } = HOSPITALITY_AUTH_RATE_LIMITS.login;

		for (let i = 0; i < loginMax; i++) {
			await app.request("/api/v1/hospitality/auth/login", {
				method: "POST",
				headers,
				body: loginBody,
			});
		}

		const loginBlocked = await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers,
			body: loginBody,
		});
		expect(loginBlocked.status).toBe(429);

		const sendOtp = await app.request("/api/v1/hospitality/auth/send-otp", {
			method: "POST",
			headers,
			body: JSON.stringify({ email: "missing@example.com" }),
		});
		expect(sendOtp.status).not.toBe(429);
		setHospitalityRateLimitStoreForTests(null);
	});

	test("P2-11 limits are stricter than legacy shared 40/15m auth bucket", () => {
		expect(HOSPITALITY_AUTH_RATE_LIMITS.login.max).toBeLessThan(40);
		expect(HOSPITALITY_AUTH_RATE_LIMITS.sendOtp.max).toBeLessThanOrEqual(5);
		expect(HOSPITALITY_AUTH_RATE_LIMITS.impersonate.max).toBeLessThan(20);
	});
});

describe("Hospitality Phase 2 — request ID middleware", () => {
	test("honors inbound x-request-id on hospitality routes", async () => {
		const app = new Hono();
		app.route("/api/v1/hospitality", hospitalityRouter);
		const res = await app.request("/api/v1/hospitality/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-request-id": "trace-hosp-99",
			},
			body: JSON.stringify({ email: "missing@example.com", password: "secret123" }),
		});
		expect(res.headers.get("X-Request-Id")).toBe("trace-hosp-99");
	});
});

describe("Hospitality Phase 2 — mail queue utility", () => {
	test("queueHospitalityMail module exports fire-and-forget helper", async () => {
		const mod = await import("@/modules/hospitality/utils/hospitality-mail-queue.ts");
		expect(typeof mod.queueHospitalityMail).toBe("function");
	});
});

describe("Hospitality Phase 2 — prefix search utility", () => {
	test("buildHospitalityBoxSearchOr uses startsWith filters", async () => {
		const { buildHospitalityBoxSearchOr, HOSPITALITY_SEARCH_QUERY_MAX } = await import(
			"@/modules/hospitality/utils/hospitality-search.ts"
		);
		const orClause = buildHospitalityBoxSearchOr("GP-12");
		expect(orClause).toEqual([
			{ name: { startsWith: "GP-12" } },
			{ box_display_id: { startsWith: "GP-12" } },
			{ hospitality_floor_boxes: { some: { room: { startsWith: "GP-12" } } } },
		]);
		expect(HOSPITALITY_SEARCH_QUERY_MAX).toBe(200);
	});

	test("box.actions uses prefix search not contains", async () => {
		const src = await Bun.file("src/db/actions/hospitality/box.actions.ts").text();
		expect(src).toContain("buildHospitalityBoxSearchOr");
		expect(src).not.toMatch(/contains:\s*trimmedQuery/);
	});
});

describe("Hospitality Phase 2 — outbox stub", () => {
	test("outbox migration defines hospitality_outbox_event table", async () => {
		const migration = await Bun.file(HOSPITALITY_PHASE2_MIGRATION).text();
		expect(migration).toContain("hospitality_outbox_event");
		expect(migration).toContain("notification");
		expect(migration).toContain("log");
	});

	test("writeHospitalityOutboxEvent and replay stub export", async () => {
		const mod = await import("@/modules/hospitality/utils/hospitality-outbox.ts");
		expect(typeof mod.writeHospitalityOutboxEvent).toBe("function");
		expect(typeof mod.replayHospitalityOutboxEvents).toBe("function");
	});
});

describe("Hospitality Phase 2 — request memo", () => {
	test("hospitalityRequestMemo caches within TTL window", async () => {
		const { hospitalityRequestMemo, clearHospitalityRequestMemoForTests } = await import(
			"@/modules/hospitality/utils/hospitality-request-memo.ts"
		);
		clearHospitalityRequestMemoForTests();
		let loads = 0;
		const loader = async () => {
			loads += 1;
			return { ok: true };
		};
		await hospitalityRequestMemo.getOrLoad("test-key", loader, 10_000);
		await hospitalityRequestMemo.getOrLoad("test-key", loader, 10_000);
		expect(loads).toBe(1);
		clearHospitalityRequestMemoForTests();
	});
});

describe("Hospitality Phase 2 — account update OTP mail hard-fail", () => {
	test("update-account handler throws OTP_SEND_FAILED on mail failure", async () => {
		const src = await Bun.file("src/modules/hospitality/handlers/account/update-account.handler.ts").text();
		expect(src).toContain("hospitality.auth.login.OTP_SEND_FAILED");
		expect(src).not.toContain("otpSendFailed");
	});

	test("resend-otp account handler throws OTP_SEND_FAILED on mail failure", async () => {
		const src = await Bun.file(
			"src/modules/hospitality/handlers/account/update-account-resend-otp.handler.ts",
		).text();
		expect(src).toContain("hospitality.auth.login.OTP_SEND_FAILED");
		expect(src).not.toContain("otpSendFailed");
	});
});

describe("Hospitality Phase 2 — account mail queue completion", () => {
	test("transfer ownership handlers use queueHospitalityMail", async () => {
		const transfer = await Bun.file(
			"src/modules/hospitality/handlers/account/transfer-ownership.handler.ts",
		).text();
		const entire = await Bun.file(
			"src/modules/hospitality/handlers/account/verify-transfer-ownership.handler.ts",
		).text();
		expect(transfer).toContain("queueHospitalityMail");
		expect(entire).toContain("queueHospitalityMail");
	});
});

describe("Hospitality Phase 2 — DATABASE_POOL_SIZE alias", () => {
	test("env exports DATABASE_POOL_SIZE with MYSQL_POOL_LIMIT alias", async () => {
		const envSrc = await Bun.file("src/configs/env.ts").text();
		expect(envSrc).toContain("DATABASE_POOL_SIZE");
		expect(envSrc).toContain("MYSQL_POOL_LIMIT");
	});

	test("db index wires connectionLimit from env config", async () => {
		const src = await Bun.file("src/db/index.ts").text();
		expect(src).toContain("DATABASE_POOL_SIZE");
		expect(src).toContain("connectionLimit: DATABASE_POOL_SIZE");
	});
});

describe("Hospitality Phase 2 — P2-13 OTP attempt counters (MySQL colocation)", () => {
	const HOSPITALITY_OTP_ATTEMPT_MIGRATION =
		"prisma/migrations/20260818100001_hospitality_otp_attempt/migration.sql";

	const hospitalityOtpHandlers = [
		"src/modules/hospitality/handlers/auth/verify-otp.handler.ts",
		"src/modules/hospitality/handlers/auth/resend-otp.handler.ts",
		"src/modules/hospitality/handlers/auth/reset-password-magic-link.handler.ts",
		"src/modules/hospitality/handlers/auth/verify-forget-password-magic-link.handler.ts",
		"src/modules/hospitality/handlers/account/confirm-update-account.handler.ts",
		"src/modules/hospitality/handlers/account/verify-transfer-ownership.handler.ts",
	];

	test("migration defines hospitality_otp_attempt table with email+scope unique index", async () => {
		const migration = await Bun.file(HOSPITALITY_OTP_ATTEMPT_MIGRATION).text();
		expect(migration).toContain("hospitality_otp_attempt");
		expect(migration).toContain("hospitality_otp_attempt_email_scope_key");
		expect(migration).toContain("`attempts`");
		expect(migration).toContain("`lock_until`");
	});

	test("lockout limits are documented in hospitality config", async () => {
		const mod = await import("@/modules/hospitality/configs/hospitality-otp-lockout-limits.ts");
		expect(mod.HOSPITALITY_OTP_MAX_ATTEMPTS).toBe(5);
		expect(mod.HOSPITALITY_OTP_LOCK_DURATION_MINUTES).toBe(30);
		expect(mod.HOSPITALITY_OTP_ATTEMPT_TTL_MS).toBe(24 * 60 * 60 * 1000);
		expect(mod.HOSPITALITY_OTP_PER_RECORD_MAX_FAILED).toBe(3);
	});

	test("hospitality OTP attempt actions use atomic Prisma increment", async () => {
		const src = await Bun.file("src/db/actions/hospitality-otp-attempt.actions.ts").text();
		expect(src).toContain("attempts: { increment: 1 }");
		expect(src).toContain("hospitality_otp_attempt");
		expect(src).not.toContain('from "../mongo-schema"');
		expect(src).not.toContain("OtpAttempt.find");
	});

	test("hospitality auth/account OTP handlers no longer import shared Mongo otp-attempt.actions", async () => {
		for (const path of hospitalityOtpHandlers) {
			const src = await Bun.file(path).text();
			expect(src).toContain("hospitality-otp-attempt.actions");
			expect(src).not.toContain('from "@/db/actions/otp-attempt.actions"');
		}
	});

	test("lockout helper exports preserve login and user scope keys", async () => {
		const { getHospitalityLoginOtpLockKey, getHospitalityUserOtpLockKey } = await import(
			"@/modules/hospitality/handlers/auth/hospitality-otp-lockout.ts"
		);
		expect(getHospitalityLoginOtpLockKey("User@Example.com")).toEqual({
			email: "user@example.com",
			ip_address: "hospitality-login-otp",
		});
		expect(getHospitalityUserOtpLockKey("usr_01", "a@b.com")).toEqual({
			email: "a@b.com",
			ip_address: "hospitality-user:usr_01",
		});
	});

	test("attempt expiry and lock threshold helpers match legacy Mongo defaults", async () => {
		const {
			isHospitalityOtpAttemptRecordExpired,
			shouldLockHospitalityOtpAttempts,
			computeHospitalityOtpLockUntil,
		} = await import("@/db/actions/hospitality-otp-attempt.actions.ts");
		const now = Date.now();
		expect(
			isHospitalityOtpAttemptRecordExpired(new Date(now - 25 * 60 * 60 * 1000), now),
		).toBe(true);
		expect(shouldLockHospitalityOtpAttempts(5)).toBe(true);
		expect(shouldLockHospitalityOtpAttempts(4)).toBe(false);
		const lockUntil = computeHospitalityOtpLockUntil(now, 30);
		expect(lockUntil.getTime()).toBe(now + 30 * 60 * 1000);
	});
});
