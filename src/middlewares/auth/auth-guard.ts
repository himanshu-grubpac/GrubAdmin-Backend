import type { UserType } from "@/types/common";
import { APIError } from "@/types/error";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { JWT } from "@/utils/jwt";
import type { admin, role } from "@/db/types";
import { getUniqueAdmin } from "@/db/actions/admin.actions.ts";
import { logger } from "@/utils/logger";

export const authGuard = (type?: UserType[]) =>
	createMiddleware<{
		Variables: {
			user_id: string;
			type: UserType;
			admin?: admin;
			role?: role | null;
		};
	}>(async (context, next) => {
		// First try to get token from cookie (HttpOnly cookie set by login)
		let authToken = getCookie(context, "auth_token");
		
		// Fallback to Authorization header
		if (!authToken) {
			authToken = context.req.header("authorization")?.split(" ")[1];
		}

		if (!authToken) {
			logger.warn(`[Auth] No auth token found in cookie or header for ${context.req.path}`);
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		let user;
		try {
			user = JWT.verifyAuthToken(authToken);
		} catch (err: any) {
			logger.warn(`[Auth] Invalid/expired admin token: ${err?.message}`);
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		if (type?.includes("admin") || type?.includes("employee")) {
			const admin = await getUniqueAdmin({
				id: user.id,
			});

			if (!admin) {
				logger.error(`[Auth] Admin lookup failed: userId=${user.id} role=${user.role}`);
				throw new APIError("You are not an admin", undefined, undefined, 403);
			}

			if (admin.user.status === "suspended") {
				logger.warn(`[Auth] Suspended admin access denied: userId=${user.id}`);
				throw new APIError("Your account is suspended. Access denied.", undefined, undefined, 403);
			}

			if (admin.user.role && admin.user.role.status !== "active") {
				logger.warn(`[Auth] Inactive role denied: userId=${user.id} roleId=${admin.user.role_id}`);
				throw new APIError("Your assigned role is suspended or deleted.", undefined, undefined, 403);
			}

			context.set("admin", admin.user);
			context.set("role", admin.user.role);
		}

		context.set("user_id", user.id);
		context.set("type", user.role);

		return next();
	});
