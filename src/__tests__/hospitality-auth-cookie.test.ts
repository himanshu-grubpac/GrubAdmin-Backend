import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import {
	clearHospitalityAuthCookie,
	extractHospitalityAuthToken,
	HOSPITALITY_AUTH_COOKIE_MAX_AGE_SECONDS,
	HOSPITALITY_AUTH_COOKIE_NAME,
	setHospitalityAuthCookie,
} from "@/modules/hospitality/utils/hospitality-auth-cookie";

describe("Hospitality auth cookie utilities", () => {
	test("cookie name matches FE auth_token session constant", () => {
		expect(HOSPITALITY_AUTH_COOKIE_NAME).toBe("auth_token");
		expect(HOSPITALITY_AUTH_COOKIE_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
	});

	test("setHospitalityAuthCookie emits httpOnly Set-Cookie header", async () => {
		const app = new Hono();
		app.get("/test", (c) => {
			setHospitalityAuthCookie(c, "jwt-session-token");
			return c.text("ok");
		});

		const res = await app.request("/test");
		const setCookie = res.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain(`${HOSPITALITY_AUTH_COOKIE_NAME}=jwt-session-token`);
		expect(setCookie.toLowerCase()).toContain("httponly");
		expect(setCookie).toContain("Path=/");
	});

	test("setAuthCookie and deleteAuthCookie are hospitality cookie aliases", async () => {
		const { setAuthCookie, deleteAuthCookie } = await import(
			"@/modules/hospitality/utils/hospitality-auth-cookie"
		);
		const app = new Hono();
		app.get("/test", (c) => {
			setAuthCookie(c, "alias-session-token");
			deleteAuthCookie(c);
			return c.text("ok");
		});

		const res = await app.request("/test");
		const setCookie = res.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain("auth_token=");
		expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/i);
	});

	test("extractHospitalityAuthToken prefers auth_token cookie over Authorization bearer", async () => {
		const app = new Hono();
		app.get("/test", (c) => {
			const token = extractHospitalityAuthToken(c);
			return c.json({ token });
		});

		const res = await app.request("/test", {
			headers: {
				Cookie: `${HOSPITALITY_AUTH_COOKIE_NAME}=from-cookie`,
				Authorization: "Bearer from-bearer",
			},
		});
		const body = (await res.json()) as { token: string };
		expect(body.token).toBe("from-cookie");
	});

	test("extractHospitalityAuthToken falls back to Authorization bearer", async () => {
		const app = new Hono();
		app.get("/test", (c) => {
			const token = extractHospitalityAuthToken(c);
			return c.json({ token });
		});

		const res = await app.request("/test", {
			headers: { Authorization: "Bearer transition-bearer-token" },
		});
		const body = (await res.json()) as { token: string };
		expect(body.token).toBe("transition-bearer-token");
	});

	test("clearHospitalityAuthCookie removes session cookie from response", async () => {
		const app = new Hono();
		app.get("/test", (c) => {
			setHospitalityAuthCookie(c, "jwt-session-token");
			clearHospitalityAuthCookie(c);
			return c.text("ok");
		});

		const res = await app.request("/test");
		const setCookie = res.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain(`${HOSPITALITY_AUTH_COOKIE_NAME}=`);
		expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/i);
	});
});

describe("Hospitality auth handlers — production cookie contract (source)", () => {
	const sessionHandlers = [
		"src/modules/hospitality/handlers/auth/login.handler.ts",
		"src/modules/hospitality/handlers/auth/verify-otp.handler.ts",
		"src/modules/hospitality/handlers/auth/set-new-password.handler.ts",
		"src/modules/hospitality/handlers/auth/reset-password-magic-link.handler.ts",
		"src/modules/hospitality/handlers/auth/impersonate.handler.ts",
	];

	test("session-establishing handlers set httpOnly cookie and omit response auth_token", async () => {
		for (const relativePath of sessionHandlers) {
			const src = await Bun.file(relativePath).text();
			expect(src).toContain("setHospitalityAuthCookie");
			expect(src).not.toMatch(/data:\s*\{[^}]*auth_token:/);
		}
	});

	test("logout and delete-account clear hospitality auth cookie", async () => {
		const logoutSrc = await Bun.file("src/modules/hospitality/handlers/auth/logout.handler.ts").text();
		const deleteSrc = await Bun.file(
			"src/modules/hospitality/handlers/account/delete-account.handler.ts",
		).text();
		expect(logoutSrc).toContain("clearHospitalityAuthCookie");
		expect(deleteSrc).toContain("clearHospitalityAuthCookie");
	});

	test("hospitality auth guard reads cookie before bearer", async () => {
		const guardSrc = await Bun.file("src/middlewares/auth/hospitality-auth-guard.ts").text();
		expect(guardSrc).toContain("extractHospitalityAuthToken");
	});
});
