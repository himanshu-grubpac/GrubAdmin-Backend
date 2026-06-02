import type { VerticalFoodEmployeeRoleType } from "@/types/common";
import { createMiddleware } from "hono/factory";
import type { client, vertical_food_employee } from "@/db/types";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { getUniqueVerticalFoodEmployee } from "@/db/actions/vertical-food-employee.actions";
import { prisma } from "@/db";
import { NODE_ENV } from "@/configs/env.ts";
import { logger } from "@/utils/logger";


export const foodAuthGuard = (type?: VerticalFoodEmployeeRoleType[], customErrorMessage?: string) =>
	createMiddleware<{
		Variables: {
			user_id: string;
			client_id: string;
			debug_client_name: string;
			debug_client_organization_name: string;
			vertical_id: string;
			debug_vertical_name: string;
			user: client | vertical_food_employee;
			type: VerticalFoodEmployeeRoleType;
			is_impersonation?: boolean;
		};
	}>(async (context, next) => {
		const authToken = context.req.header("authorization")?.split(" ")[1];

		if (!authToken) {
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		// Support both regular food auth tokens AND impersonation tokens
		let userId: string;
		let isImpersonation = false;

		if (JWT.isImpersonationToken(authToken)) {
			const impersonationUser = JWT.verifyImpersonationToken(authToken);
			userId = impersonationUser.id;
			isImpersonation = true;
			logger.info(`[Auth] Impersonation token verified: admin=${impersonationUser.admin_id} target_user=${impersonationUser.id}`);
		} else {
			const user = JWT.verifyFoodAuthToken(authToken);
			userId = user.id;
		}

		const employee = await getUniqueVerticalFoodEmployee({
			id: userId,
		});

		if (!employee) {
			logger.error(`[Auth] Employee lookup failed: userId=${userId} isImpersonation=${isImpersonation}`);
			throw new APIError("No employee found... unauthorized access", undefined, undefined, 403);
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
				: (employee.employee as vertical_food_employee).client_id;

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
			include: { vertical: true },
		});

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

		// Only inject client_id and vertical details into successful JSON responses that don't already have them
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
				// Ignore errors if the body is already consumed or not JSON
			}
		}
	});

