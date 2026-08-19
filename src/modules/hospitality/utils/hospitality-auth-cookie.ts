import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { NODE_ENV } from "@/configs/env";

/** Matches GrubHospitality-Frontend-1 `HOSPITALITY_SESSION_COOKIE_NAME` (`auth.js`). */
export const HOSPITALITY_AUTH_COOKIE_NAME = "auth_token";

/** 7 days — matches FE `AUTH_COOKIE_MAX_AGE_SECONDS`. */
export const HOSPITALITY_AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Prior BE rollout names — cleared on logout for transition. */
const LEGACY_AUTH_COOKIE_NAMES = ["grubpac-auth-token"] as const;

export const getHospitalityAuthCookieOptions = () => {
	const isProduction = NODE_ENV === "production";
	return {
		path: "/",
		httpOnly: true,
		secure: isProduction,
		sameSite: (isProduction ? "None" : "Lax") as "Lax" | "None",
		maxAge: HOSPITALITY_AUTH_COOKIE_MAX_AGE_SECONDS,
	};
};

export const setHospitalityAuthCookie = (context: Context, token: string) => {
	setCookie(context, HOSPITALITY_AUTH_COOKIE_NAME, token, getHospitalityAuthCookieOptions());
};

/** Alias for hospitality auth handlers — matches shared `setAuthCookie` naming. */
export const setAuthCookie = setHospitalityAuthCookie;

export const clearHospitalityAuthCookie = (context: Context) => {
	const isProduction = NODE_ENV === "production";
	const clearOptions = {
		path: "/",
		secure: isProduction,
		sameSite: (isProduction ? "None" : "Lax") as "Lax" | "None",
	};

	deleteCookie(context, HOSPITALITY_AUTH_COOKIE_NAME, clearOptions);
	for (const legacyName of LEGACY_AUTH_COOKIE_NAMES) {
		deleteCookie(context, legacyName, clearOptions);
	}
};

/** Alias for hospitality logout/delete-account — matches shared `deleteAuthCookie` naming. */
export const deleteAuthCookie = clearHospitalityAuthCookie;

/**
 * Production session extraction: httpOnly `auth_token` cookie first;
 * Authorization Bearer fallback for tests/transition only.
 */
export const extractHospitalityAuthToken = (context: Context): string | undefined => {
	const fromCookie = getCookie(context, HOSPITALITY_AUTH_COOKIE_NAME);
	if (fromCookie) {
		return fromCookie;
	}

	for (const legacyName of LEGACY_AUTH_COOKIE_NAMES) {
		const legacy = getCookie(context, legacyName);
		if (legacy) {
			return legacy;
		}
	}

	const authHeader = context.req.header("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const bearer = authHeader.slice("Bearer ".length).trim();
		if (bearer) {
			return bearer;
		}
	}

	return undefined;
};
