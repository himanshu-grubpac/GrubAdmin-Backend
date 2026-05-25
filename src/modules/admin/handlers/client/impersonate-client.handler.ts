import { createHandlers } from "@/utils/hono-factory";
import { authGuard } from "@/middlewares/auth";
import { Permission } from "@/utils/permission";
import { getUniqueClient } from "@/db/actions/client.actions";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt";
import { services } from "@/services";
import { CLIENT_DASHBOARD_URL, JWT_ACCESS_TOKEN_EXPIRY } from "@/configs/env";
import { setAuthCookie } from "@/utils/cookie";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { logger } from "@/utils/logger";

export const impersonateClientHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const clientId = context.req.param("id");
		const admin = context.get("admin");
		const role = context.get("role");

		logger.info(`[Impersonation] Request initiated by admin ${admin.id} (${admin.first_name} ${admin.last_name || ""}) for client ${clientId}`);

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: ["view client account"],
			},
		});

		if (!clientId) {
			throw new APIError("Client ID is required", undefined, undefined, 400);
		}

		const client = await getUniqueClient({ id: clientId });

		if (!client) {
			logger.warn(`[Impersonation] Client not found: ${clientId}`);
			throw new APIError(undefined, "admin.client.NOT_FOUND", undefined, 404);
		}

		if (client.status === "suspended" || client.status === "inactive") {
			logger.warn(`[Impersonation] Attempted impersonation of ${client.status} client: ${clientId}`);
			throw new APIError(
				`Cannot access a ${client.status} client account. Only active clients can be accessed.`,
				undefined,
				undefined,
				403,
			);
		}

		const userType = context.get("type");

		const impersonationToken = JWT.signImpersonationToken({
			id: client.id,
			role: "impersonation",
			admin_id: admin.id,
			client_id: client.id,
			is_impersonation: true,
			admin_role: userType as "admin" | "employee",
		});

		logger.info(`[Impersonation] Token generated successfully for admin ${admin.id} → client ${client.id} (${client.name})`);

		setAuthCookie(context, impersonationToken, { expiresIn: 1800 });

		const ip = context.req.header("x-forwarded-for")?.split(",")[0] ||
				   context.req.header("x-real-ip") ||
				   DEFAULT_IP_ADDRESS;

		await services.adminLogger.log({
			module: "client",
			action: "impersonation",
			admin_id: admin.id,
			admin_name: `${admin.first_name} ${admin.last_name || ""}`.trim(),
			role_id: admin.role_id,
			role_name: role?.name || "Admin",
			ip,
			effected_id: client.id,
			effected_name: client.name,
		});

		logger.info(`[Impersonation] Successfully completed for admin ${admin.id} → client ${client.id}`);

		const response = {
			success: true,
			data: {
				token: impersonationToken,
				client: {
					id: client.id,
					name: client.name,
					client_id: client.client_display_id || client.id,
					email: client.email,
					vertical: client.vertical?.name || null,
				},
				redirect_url: CLIENT_DASHBOARD_URL
					? `${CLIENT_DASHBOARD_URL}/impersonate?token=${impersonationToken}`
					: null,
			},
			...resolveMessageTemplate("admin.client.IMPERSONATION_SUCCESS"),
		};

		return context.json(response as any, 200);
	},
);
