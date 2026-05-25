import type { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { NODE_ENV } from "@/configs/env";

export interface SetAuthCookieOptions {
	expiresIn?: number;
}

/**
 * Set JWT token as HttpOnly Secure cookie.
 * For cross-origin requests, SameSite must be "None" and the cookie must be Secure.
 * Browsers may reject SameSite=None cookies unless Secure is enabled, even during local development.
 * @param context - Hono context
 * @param token - JWT token to store
 * @param options - Cookie options
 */
export const setAuthCookie = (
	context: Context,
	token: string,
	options: SetAuthCookieOptions = {},
) => {
	const { expiresIn = 86400 } = options;
	const expiresAt = new Date(Date.now() + expiresIn * 1000);
	const isProduction = NODE_ENV === "production";

	setCookie(context, "auth_token", token, {
		httpOnly: true,
		secure: NODE_ENV === "production",
		sameSite: NODE_ENV === "production" ? "None" : "Lax",
		secure: isProduction,   // Only require HTTPS in production — dev uses http://localhost
		sameSite: isProduction ? "None" : "Lax",
		path: "/",
		maxAge: expiresIn,
		expires: expiresAt,
	});
};

/**
 * Clear the auth cookie (for logout).
 * Must use the same attributes as setAuthCookie so the browser actually clears it.
 * @param context - Hono context
 */
export const deleteAuthCookie = (context: Context) => {
	const isProduction = NODE_ENV === "production";
	deleteCookie(context, "auth_token", {
		path: "/",
		secure: isProduction,
		sameSite: isProduction ? "None" : "Lax",
	});
};
