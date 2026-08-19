import type { VerticalDeliveryEmployeeRoleType } from "@/types/common";
import { createMiddleware } from "hono/factory";
import type { client, vertical_delivery_employee } from "@/db/types";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { getUniqueVerticalDeliveryEmployee } from "@/db/actions/vertical-delivery-employee.actions";
import { prisma } from "@/db";
import { NODE_ENV } from "@/configs/env.ts";
import { logger } from "@/utils/logger";
import type { DeliveryAuthPayload } from "@/types/jwt/delivery-auth-payload";


export const deliveryAuthGuard = (type?: VerticalDeliveryEmployeeRoleType[], customErrorMessage?: string) =>
	createMiddleware<{
		Variables: {
			user_id: string;
			client_id: string;
			debug_client_name: string;
			debug_client_organization_name: string;
			vertical_id: string;
			debug_vertical_name: string;
			user: client | vertical_delivery_employee;
			type: VerticalDeliveryEmployeeRoleType;
			is_impersonation?: boolean;
		};
	}>(async (context, next) => {
		const authToken = context.req.header("authorization")?.split(" ")[1];

		if (!authToken) {
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		let userId: string;
		let isImpersonation = false;
		let deliveryAuthUser: DeliveryAuthPayload | null = null;

		if (JWT.isImpersonationToken(authToken)) {
			const impersonationUser = JWT.verifyImpersonationToken(authToken);
			userId = impersonationUser.client_id;
			isImpersonation = true;
			logger.info(`[Auth] Impersonation token verified: admin=${impersonationUser.admin_id} target_customer=${impersonationUser.client_id}`);
		} else {
			deliveryAuthUser = JWT.verifyDeliveryAuthToken(authToken);
			userId = deliveryAuthUser.id;
		}

		const employee = await getUniqueVerticalDeliveryEmployee({
			id: userId,
		});

		if (!employee) {
			logger.error(`[Auth] Employee lookup failed: userId=${userId} isImpersonation=${isImpersonation}`);
			throw new APIError("No employee found... unauthorized access", undefined, undefined, 403);
		}

		if (employee.employee.status === "suspended") {
			logger.warn(`[Auth] Suspended employee blocked: userId=${userId}`);
			throw new APIError("Your account has been suspended!", undefined, undefined, 403);
		}

		if (type && !type.includes(employee?.type)) {
			logger.warn(`[Auth] Role check failed: userId=${userId} expectedType=${type?.join(",")} actualType=${employee.type}`);
			throw new APIError(
				customErrorMessage || "Unauthorized access... please contact the admin",
				undefined,
				undefined,
				403,
			);
		}

		const client_id =
			employee.type === "admin"
				? (employee.employee as client).id
				: (employee.employee as vertical_delivery_employee).client_id;

		if (!client_id) {
			logger.error(`[Auth] No client ID: userId=${userId} employeeType=${employee.type}`);
			throw new APIError(
				"No client ID found associated with this account",
				undefined,
				undefined,
				403,
			);
		}

		const client = await prisma.client.findUnique({
			where: { id: client_id },
			select: {
				name: true,
				organization_name: true,
				vertical_id: true,
				status: true,
				auth_token_version: true,
				vertical: { select: { name: true } },
			},
		});

		if (!client) {
			logger.error(`[Auth] Client not found: userId=${userId} clientId=${client_id}`);
			throw new APIError("Unauthorized access... please contact the admin", undefined, undefined, 403);
		}

		if (client.status === "suspended") {
			logger.warn(`[Auth] Suspended client blocked: userId=${userId} clientId=${client_id}`);
			throw new APIError("Your account has been suspended!", undefined, undefined, 403);
		}

		if (client.status !== "active") {
			logger.warn(`[Auth] Inactive client blocked: userId=${userId} clientId=${client_id} status=${client.status}`);
			throw new APIError("Your account is not active.", undefined, undefined, 403);
		}

		if (!isImpersonation && deliveryAuthUser) {
			const tokenVersion = deliveryAuthUser.token_version ?? 0;
			if (tokenVersion !== (client.auth_token_version ?? 0)) {
				throw new APIError(
					"The auth token is either invalid or has expired!",
					undefined,
					undefined,
					401,
				);
			}
		}

		const debug_client_name = client?.name || "";
		const debug_client_organization_name = client?.organization_name || "";
		const vertical_id = client?.vertical_id || "";
		const debug_vertical_name = client?.vertical?.name || "";

		context.set("user", employee.employee);
		context.set("type", employee.type);
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
