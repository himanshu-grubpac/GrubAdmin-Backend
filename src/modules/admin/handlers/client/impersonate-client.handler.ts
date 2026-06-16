import { createHandlers } from "@/utils/hono-factory";
import { authGuard } from "@/middlewares/auth";
import { Permission } from "@/utils/permission";
import { getUniqueClient } from "@/db/actions/client.actions";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt";
import { services } from "@/services";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants";
import { resolveMessageTemplate } from "@/utils/message";
import { logger } from "@/utils/logger";
import { CLIENT_DASHBOARD_URL } from "@/configs/env";

export const impersonateClientHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const clientId = context.req.param("id");
		const admin = context.get("admin");
		const role = context.get("role");

		logger.info(`[Impersonation] Request initiated by admin ${admin!.id} (${admin!.first_name} ${admin!.last_name || ""}) for client ${clientId}`);

		if (!clientId) {
			throw new APIError("Client ID is required", undefined, undefined, 400);
		}

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				clients: ["view client account"],
			},
		});

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

		const verticalName = client.vertical?.name || null;

		if (!verticalName || verticalName.toLowerCase() !== "delivery") {
			logger.warn(`[Impersonation] Client ${clientId} is not a delivery client (vertical: ${verticalName})`);
			throw new APIError(
				"Delivery account not configured for this client. Only delivery clients can be accessed.",
				undefined,
				undefined,
				400,
			);
		}

		const userType = context.get("type");

		const body = await context.req.json().catch(() => ({}));
		const returnUrl = body?.return_url || null;

		const impersonationToken = JWT.signImpersonationToken({
			id: client.id,
			role: "impersonation",
			admin_id: admin!.id,
			client_id: client.id,
			is_impersonation: true,
			admin_role: userType as "admin" | "employee",
			vertical_name: verticalName,
			client_name: client.name,
			return_url: returnUrl,
		});

		logger.info(`[Impersonation] Token generated successfully for admin ${admin!.id} → client ${client.id} (${client.name})`);

		const ip = context.req.header("x-forwarded-for")?.split(",")[0] ||
				   context.req.header("x-real-ip") ||
				   DEFAULT_IP_ADDRESS;

		await services.adminLogger.log({
			module: "client",
			action: "impersonation",
			admin_id: admin!.id,
			admin_name: `${admin!.first_name} ${admin!.last_name || ""}`.trim(),
			role_id: admin!.role_id,
			role_name: role?.name || "Admin",
			ip,
			effected_id: client.id,
			effected_name: client.name,
		});

		logger.info(`[Impersonation] Successfully completed for admin ${admin!.id} → client ${client.id}`);

		const deliveryBaseUrl = CLIENT_DASHBOARD_URL || "http://13.127.79.155";
		const redirectUrl = `${deliveryBaseUrl}/impersonate?token=${impersonationToken}`;

		const response = {
			success: true,
			data: {
				token: impersonationToken,
				client: {
					id: client.id,
					name: client.name,
					client_id: client.client_display_id || client.id,
					email: client.email,
					vertical: verticalName,
				},
				redirect_url: redirectUrl,
				delivery_base_url: deliveryBaseUrl,
			},
			...resolveMessageTemplate("admin.client.IMPERSONATION_SUCCESS"),
		};

		return context.json(response as any, 200);
	},
);
