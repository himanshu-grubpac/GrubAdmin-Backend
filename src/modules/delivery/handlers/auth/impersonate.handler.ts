import { createHandlers } from "@/utils/hono-factory";
import { JWT } from "@/utils/jwt";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { APIError } from "@/types/error";
import { setAuthCookie } from "@/utils/cookie";
import { services } from "@/services";
import { logger } from "@/utils/logger";
import { CLIENT_DASHBOARD_URL } from "@/configs/env";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants";
import type { client } from "@/db/types";

interface ImpersonateRequestBody {
	token?: string;
	code?: string;
}

export const deliveryImpersonateHandler = createHandlers(
	async (context) => {
		// Ensure the parsed body always matches the expected shape (token/code are optional).
		const body = await context.req
			.json<ImpersonateRequestBody>()
			.catch(() => ({} as ImpersonateRequestBody));
		let token = body?.token;

		if (!token && body?.code) {
			token = JWT.verifyImpersonationExchangeCode(body.code);
		}

		if (!token) {
			throw new APIError("Impersonation token or exchange code is required", undefined, undefined, 400);
		}

		const payload = JWT.verifyImpersonationToken(token);

		const ip = context.req.header("x-forwarded-for")?.split(",")[0] ||
				   context.req.header("x-real-ip") ||
				   DEFAULT_IP_ADDRESS;

		logger.info(`[Impersonation] Processing impersonation token: admin=${payload.admin_id} customer=${payload.client_id}`);

		const employee = await getUniqueVerticalDeliveryEmployee({
			id: payload.client_id,
		});

		if (!employee) {
			logger.error(`[Impersonation] No delivery user found for customer ${payload.client_id}`);
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
			throw new APIError("Delivery account not found for this customer", undefined, undefined, 404);
		}

		const clientRecord = employee.type === "admin"
			? (employee.employee as client)
			: null;

		if (!clientRecord) {
			logger.error(`[Impersonation] Employee type is not admin for customer ${payload.client_id}`);
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

		const deliveryToken = JWT.signDeliveryAuthToken({
			role: "admin",
			id: clientRecord.id,
		});

		setAuthCookie(context, deliveryToken, { expiresIn: 86400 });

		logger.info(`[Impersonation] Session created: admin=${payload.admin_id} logged_in_as=${clientRecord.id} (${clientRecord.name})`);

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

		if (!CLIENT_DASHBOARD_URL) {
			throw new APIError(
				"Client dashboard URL is not configured. Set CLIENT_DASHBOARD_URL.",
				undefined,
				undefined,
				500,
			);
		}
		const deliveryBaseUrl = CLIENT_DASHBOARD_URL.replace(/\/$/, "");

		// Use return_url from token payload if provided, otherwise default to dashboard
		const targetPath = payload.return_url || "/delivery/dashboard";

		return context.json({
			success: true,
			code: 200,
			data: {
				auth_token: deliveryToken,
				client: {
					id: clientRecord.id,
					name: clientRecord.name,
					email: clientRecord.email,
					client_display_id: clientRecord.client_display_id,
				},
				redirect_url: `${deliveryBaseUrl}${targetPath}`,
			},
			message: "Impersonation successful. You are now logged in as the customer.",
		});
	},
);
