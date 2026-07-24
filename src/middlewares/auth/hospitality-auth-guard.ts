import { createMiddleware } from "hono/factory";
import type { client } from "@/db/types";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { prisma } from "@/db";
import { NODE_ENV } from "@/configs/env.ts";
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
			const user = JWT.verifyHospitalityAuthToken(authToken);
			userId = user.id;
		}

		const clientRecord = await prisma.client.findUnique({
			where: { id: userId },
			include: { vertical: true },
		});

		if (!clientRecord) {
			logger.error(`[Auth] Client lookup failed: userId=${userId} isImpersonation=${isImpersonation}`);
			throw new APIError("No account found... unauthorized access", undefined, undefined, 403);
		}

		const client_id = clientRecord.id;
		const debug_client_name = clientRecord.name || "";
		const debug_client_organization_name = clientRecord.organization_name || "";
		const vertical_id = clientRecord.vertical_id || "";
		const debug_vertical_name = clientRecord.vertical?.name || "";

		context.set("user", clientRecord);
		context.set("type", "admin");
		context.set("user_id", userId);
		context.set("client_id", client_id);
		context.set("debug_client_name", debug_client_name);
		context.set("debug_client_organization_name", debug_client_organization_name);
		context.set("vertical_id", vertical_id);
		context.set("debug_vertical_name", debug_vertical_name);
		if (isImpersonation) context.set("is_impersonation", true);

		await next();

		if (
			context.res.ok &&
			context.res.headers.get("Content-Type")?.includes("application/json")
		) {
			try {
				const body = (await context.res.json()) as any;
				if (body && typeof body === "object") {
					if (!body.client_id) body.client_id = client_id;
					if (!body.vertical_id) body.vertical_id = vertical_id;
					if (!body.user_id) body.user_id = userId;
					if (!body.vertical_name) body.vertical_name = debug_vertical_name;
					if (!body.is_impersonation) body.is_impersonation = isImpersonation;

					if (NODE_ENV !== "production") {
						body.debug = {
							...(body.debug || {}),
							client_name: debug_client_name,
							client_organization_name: debug_client_organization_name,
							vertical_name: debug_vertical_name,
							is_impersonation: isImpersonation,
						};
					}

					context.res = context.json(body, context.res.status as any);
				}
			} catch (e) {
			}
		}
	});
