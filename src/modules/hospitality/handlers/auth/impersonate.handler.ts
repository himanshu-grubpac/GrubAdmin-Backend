import { createHandlers } from "@/utils/hono-factory";
import { JWT } from "@/utils/jwt";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { DEFAULT_IP_ADDRESS, HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import { prisma } from "@/db";
import { signHospitalitySessionToken } from "./hospitality-auth-token";
import { getHospitalityFrontendUrl } from "./auth.utils";
import { setHospitalityAuthCookie } from "hospitality/utils/hospitality-auth-cookie";

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

		logHospitality(context, "info", "hospitality_impersonation_started", {
			admin_id: payload.admin_id,
			client_id: payload.client_id,
		});

		const clientRecord = await prisma.client.findUnique({
			where: { id: payload.client_id },
			include: { vertical: true },
		});

		if (!clientRecord) {
			logHospitality(context, "error", "hospitality_impersonation_client_not_found", {
				admin_id: payload.admin_id,
				client_id: payload.client_id,
			});
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
			logHospitality(context, "error", "hospitality_impersonation_wrong_vertical", {
				admin_id: payload.admin_id,
				client_id: payload.client_id,
			});
			throw new APIError("Invalid account type for impersonation", undefined, undefined, 403);
		}

		if (clientRecord.status !== "active") {
			logHospitality(context, "warn", "hospitality_impersonation_inactive_client", {
				admin_id: payload.admin_id,
				client_id: payload.client_id,
				status: clientRecord.status,
			});
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

		const authToken = await signHospitalitySessionToken(clientRecord.id, "admin", {
			is_impersonation: true,
			admin_id: payload.admin_id,
		});

		setHospitalityAuthCookie(context, authToken);

		logHospitality(context, "info", "hospitality_impersonation_session_created", {
			admin_id: payload.admin_id,
			client_id: clientRecord.id,
		});

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

		let baseUrl: string;
		try {
			baseUrl = getHospitalityFrontendUrl();
		} catch {
			throw new APIError(
				"Hospitality frontend URL is not configured. Set HOSPITALITY_FRONTEND_URL, CLIENT_DASHBOARD_URL, or FRONTEND_URL.",
				undefined,
				undefined,
				500,
			);
		}
		const targetPath = payload.return_url || "/hospitality/dashboard";

		return context.json({
			success: true,
			code: 200,
			data: {
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
