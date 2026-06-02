import { createHandlers } from "@/utils/hono-factory";
import { JWT } from "@/utils/jwt";
import { setAuthCookie } from "@/utils/cookie";
import { JWT_ACCESS_TOKEN_EXPIRY } from "@/configs/env";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants";
import { logger } from "@/utils/logger";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { getUniqueAdmin } from "@/db/actions/admin.actions";

export const exitImpersonationHandler = createHandlers(
	async (context) => {
		const authHeader = context.req.header("authorization");
		let adminToken: string | null = null;

		if (authHeader?.startsWith("Bearer ")) {
			adminToken = authHeader.slice(7);
		}

		if (!adminToken) {
			throw new APIError("No admin token provided", undefined, undefined, 401);
		}

		try {
			const user = JWT.verifyAuthToken(adminToken);

			if (user.role !== "admin" && user.role !== "employee") {
				throw new APIError("Invalid admin token: incorrect role", undefined, undefined, 401);
			}

			setAuthCookie(context, adminToken, { expiresIn: JWT_ACCESS_TOKEN_EXPIRY });

			logger.info(`[Impersonation] Admin session restored for ${user.id}`);

			// Log the exit event
			try {
				const admin = await getUniqueAdmin({ id: user.id });
				if (admin) {
					const ip = context.req.header("x-forwarded-for")?.split(",")[0] ||
							   context.req.header("x-real-ip") ||
							   DEFAULT_IP_ADDRESS;
					await services.adminLogger.log({
						module: "client",
						action: "impersonation",
						admin_id: admin.user.id,
						admin_name: `${admin.user.first_name} ${admin.user.last_name || ""}`.trim(),
						role_id: admin.user.role_id,
						role_name: admin.user.role?.name || "Admin",
						ip,
						effected_id: admin.user.id,
						effected_name: `${admin.user.first_name} ${admin.user.last_name || ""}`.trim(),
					});
				}
			} catch (logErr) {
				logger.error(`[Impersonation] Failed to log exit event: ${logErr}`);
			}

			return context.json(
				{
					success: true,
					code: 200,
					message: "Admin session restored successfully.",
				},
				200,
			);
		} catch (err) {
			if (err instanceof APIError) throw err;
			logger.error(`[Impersonation] Failed to restore admin session: ${err}`);
			throw new APIError("Failed to restore admin session", undefined, undefined, 401);
		}
	},
);
