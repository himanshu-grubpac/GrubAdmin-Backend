import { createHandlers } from "@/utils/hono-factory";
import { authGuard } from "@/middlewares/auth";
import { Permission } from "@/utils/permission";
import { getUniqueClient } from "@/db/actions/client.actions";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt";
import { services } from "@/services";
import { DEFAULT_IP_ADDRESS, DELIVERY_VERTICAL_NAME, MEDICAL_VERTICAL_NAME, HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
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

		if (!verticalName) {
			logger.warn(`[Impersonation] Client ${clientId} has no assigned vertical`);
			throw new APIError(
				"No vertical configured for this client. Cannot initiate impersonation.",
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

		if (!CLIENT_DASHBOARD_URL) {
			throw new APIError(
				"Client dashboard URL is not configured. Set CLIENT_DASHBOARD_URL.",
				undefined,
				undefined,
				500,
			);
		}

		const baseUrl = CLIENT_DASHBOARD_URL.replace(/\/$/, "");

		const impersonationPathMap: Record<string, string> = {
			[DELIVERY_VERTICAL_NAME]: "/impersonate",
			[MEDICAL_VERTICAL_NAME]: "/medical/impersonate",
			[HOSPITALITY_VERTICAL_NAME]: "/hospitality/impersonate",
		};

		const impersonationPath = impersonationPathMap[verticalName] || "/impersonate";
		const exchangeCode = JWT.signImpersonationExchangeCode(impersonationToken);
		const redirectUrl = `${baseUrl}${impersonationPath}?code=${encodeURIComponent(exchangeCode)}`;

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
				redirect_base_url: baseUrl,
				delivery_base_url: baseUrl,
			},
			...resolveMessageTemplate("admin.client.IMPERSONATION_SUCCESS"),
		};

		return context.json(response as any, 200);
	},
);
