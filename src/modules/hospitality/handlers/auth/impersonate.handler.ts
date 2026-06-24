import { createHandlers } from "@/utils/hono-factory";
import { JWT } from "@/utils/jwt";
import { APIError } from "@/types/error";
import { setAuthCookie } from "@/utils/cookie";
import { services } from "@/services";
import { logger } from "@/utils/logger";
import { CLIENT_DASHBOARD_URL } from "@/configs/env";
import { DEFAULT_IP_ADDRESS, HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import { prisma } from "@/db";

interface ImpersonateRequestBody {
	token: string;
}

export const hospitalityImpersonateHandler = createHandlers(
	async (context) => {
		const { token } = await context.req.json<ImpersonateRequestBody>().catch(() => {
			throw new APIError("Request body must contain a token field", undefined, undefined, 400);
		});

		if (!token) {
			throw new APIError("Impersonation token is required", undefined, undefined, 400);
		}

		const payload = JWT.verifyImpersonationToken(token);

		const ip = context.req.header("x-forwarded-for")?.split(",")[0] ||
			context.req.header("x-real-ip") ||
			DEFAULT_IP_ADDRESS;

		logger.info(`[Impersonation] Processing hospitality impersonation token: admin=${payload.admin_id} customer=${payload.client_id}`);

		const clientRecord = await prisma.client.findUnique({
			where: { id: payload.client_id },
			include: { vertical: true },
		});

		if (!clientRecord) {
			logger.error(`[Impersonation] No hospitality client found for customer ${payload.client_id}`);
			await services.adminLogger.log({
				module: "client",
				action: "impersonation",
				admin_id: payload.admin_id,
				admin_name: payload.client_name || "Unknown",
				role_id: "",
				role_name: "Admin",
				ip,
				effected_id: payload.client_id,
				effected_name: payload.client_name || "Unknown",
			}).catch(() => {});
			throw new APIError("Hospitality account not found for this customer", undefined, undefined, 404);
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			logger.error(`[Impersonation] Client is not hospitality vertical: ${payload.client_id}`);
			throw new APIError("Invalid account type for impersonation", undefined, undefined, 403);
		}

		if (clientRecord.status !== "active") {
			logger.warn(`[Impersonation] Customer account is ${clientRecord.status}: ${payload.client_id}`);
			const statusMessages: Record<string, string> = {
				suspended: "This account has been suspended.",
				inactive: "This account is inactive.",
			};
			throw new APIError(
				statusMessages[clientRecord.status] || "Account is not active.",
				undefined,
				undefined,
				403,
			);
		}

		const authToken = JWT.signDeliveryAuthToken({
			role: "admin",
			id: clientRecord.id,
		});

		setAuthCookie(context, authToken, { expiresIn: 86400 });

		logger.info(`[Impersonation] Hospitality session created: admin=${payload.admin_id} logged_in_as=${clientRecord.id} (${clientRecord.name})`);

		await services.adminLogger.log({
			module: "client",
			action: "impersonation",
			admin_id: payload.admin_id,
			admin_name: payload.client_name || "Unknown Admin",
			role_id: "",
			role_name: "Admin (Impersonating)",
			ip,
			effected_id: clientRecord.id,
			effected_name: clientRecord.name,
		}).catch(() => {});

		const baseUrl = CLIENT_DASHBOARD_URL || "http://13.127.79.155";
		const targetPath = payload.return_url || "/hospitality/dashboard";

		return context.json({
			success: true,
			code: 200,
			data: {
				auth_token: authToken,
				client: {
					id: clientRecord.id,
					name: clientRecord.name,
					email: clientRecord.email,
					client_display_id: clientRecord.client_display_id,
				},
				redirect_url: `${baseUrl}${targetPath}`,
			},
			message: "Impersonation successful. You are now logged in as the customer.",
		});
	},
);
