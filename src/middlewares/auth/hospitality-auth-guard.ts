import { createMiddleware } from "hono/factory";
import type { client } from "@/db/types";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { prisma } from "@/db";
import { logger } from "@/utils/logger";

export const hospitalityAuthGuard = () =>
	createMiddleware<{
		Variables: {
			user_id: string;
			client_id: string;
			debug_client_name: string;
			debug_client_organization_name: string;
			vertical_id: string;
			debug_vertical_name: string;
			user: client;
			type: "admin";
			is_impersonation?: boolean;
		};
	}>(async (context, next) => {
		const authToken = context.req.header("authorization")?.split(" ")[1];

		if (!authToken) {
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		let userId: string;
		let isImpersonation = false;

		if (JWT.isImpersonationToken(authToken)) {
			const impersonationUser = JWT.verifyImpersonationToken(authToken);
			userId = impersonationUser.client_id;
			isImpersonation = true;
			logger.info(`[Auth] Impersonation token verified: admin=${impersonationUser.admin_id} target_customer=${impersonationUser.client_id}`);
		} else {
			const user = JWT.verifyDeliveryAuthToken(authToken);
			userId = user.id;
		}

		// Since Hospitality vertical only deals with client admin accounts
		const clientRecord = await prisma.client.findUnique({
			where: { id: userId },
			include: { vertical: true },
		});

		if (!clientRecord) {
			logger.error(`[Auth] Client admin lookup failed: userId=${userId}`);
			throw new APIError("No account found... unauthorized access", undefined, undefined, 403);
		}

		if (clientRecord.status === "suspended") {
			throw new APIError("Your account has been suspended!", "hospitality.auth.login.SUSPENDED", undefined, 403);
		}

		// Verify vertical is "Hospitality"
		if (clientRecord.vertical?.name !== "Hospitality") {
			logger.warn(`[Auth] Vertical mismatch: userId=${userId} actualVertical=${clientRecord.vertical?.name}`);
			throw new APIError("Access denied: Not a hospitality account.", "hospitality.common.ACCESS_DENIED", undefined, 403);
		}

		context.set("user", clientRecord);
		context.set("type", "admin");
		context.set("user_id", userId);
		context.set("client_id", userId);
		context.set("debug_client_name", clientRecord.name || "");
		context.set("debug_client_organization_name", clientRecord.organization_name || "");
		context.set("vertical_id", clientRecord.vertical_id || "");
		context.set("debug_vertical_name", clientRecord.vertical?.name || "");
		if (isImpersonation) context.set("is_impersonation", true);

		await next();
	});
