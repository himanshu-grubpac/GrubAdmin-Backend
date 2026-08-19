import type { HospitalityEmployeeRoleType } from "@/types/common";
import { createMiddleware } from "hono/factory";
import type { client, vertical_hospitality_employee } from "@/db/types";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import { getUniqueHospitalityEmployee } from "@/db/actions/hospitality/employee.actions";
import { prisma } from "@/db";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { extractHospitalityAuthToken } from "hospitality/utils/hospitality-auth-cookie";
import { extractPasswordFromUser } from "hospitality/utils/sanitize-user";

export const hospitalityAuthGuard = (type?: HospitalityEmployeeRoleType[], customErrorMessage?: string) =>
	createMiddleware<{
		Variables: {
			user_id: string;
			client_id: string;
			debug_client_name: string;
			debug_client_organization_name: string;
			vertical_id: string;
			debug_vertical_name: string;
			user: Omit<client | vertical_hospitality_employee, "password">;
			password_hash: string | null;
			is_password_set: boolean;
			type: HospitalityEmployeeRoleType;
			is_impersonation?: boolean;
		};
	}>(async (context, next) => {
		const authToken = extractHospitalityAuthToken(context);

		if (!authToken) {
			throw new APIError("Unauthenticated access", undefined, undefined, 401);
		}

		let userId: string;
		let isImpersonation = false;

		if (JWT.isImpersonationToken(authToken)) {
			throw new APIError(
				"Impersonation token must be exchanged via /hospitality/auth/impersonate",
				undefined,
				undefined,
				403,
			);
		}

		const user = JWT.verifyHospitalityAuthToken(authToken);
		userId = user.id;
		isImpersonation = user.is_impersonation === true;

		const employee = await getUniqueHospitalityEmployee({
			id: userId,
		});

		if (!employee) {
			logHospitality(context, "error", "hospitality_auth_employee_not_found", {
				user_id: userId,
				is_impersonation: isImpersonation,
			});
			throw new APIError("No employee found... unauthorized access", undefined, undefined, 403);
		}

		if (type && !type.includes(employee?.type)) {
			logHospitality(context, "warn", "hospitality_auth_role_denied", {
				user_id: userId,
				expected_roles: type,
				actual_role: employee.type,
			});
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
				: (employee.employee as vertical_hospitality_employee).client_id;

		if (!client_id) {
			logHospitality(context, "error", "hospitality_auth_missing_client_id", {
				user_id: userId,
				employee_type: employee.type,
			});
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

		if (!client) {
			logHospitality(context, "error", "hospitality_auth_client_not_found", {
				user_id: userId,
				client_id,
			});
			throw new APIError("Unauthorized access... please contact the admin", undefined, undefined, 403);
		}

		if (client.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			logHospitality(context, "warn", "hospitality_auth_wrong_vertical", {
				user_id: userId,
				client_id,
			});
			throw new APIError("You are not authorized to login.", undefined, undefined, 403);
		}

		if (client.status !== "active") {
			logHospitality(context, "warn", "hospitality_auth_inactive_client", {
				user_id: userId,
				client_id,
				status: client.status,
			});
			throw new APIError("Your account is not active.", undefined, undefined, 403);
		}

		const tokenVersion = user.token_version ?? 0;
		if (tokenVersion !== (client.auth_token_version ?? 0)) {
			throw new APIError(
				"The auth token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		const debug_client_name = client?.name || "";
		const debug_client_organization_name = client?.organization_name || "";
		const vertical_id = client?.vertical_id || "";
		const debug_vertical_name = client?.vertical?.name || "";

		const { user: sanitizedUser, password_hash, is_password_set } = extractPasswordFromUser(employee.employee);
		context.set("user", sanitizedUser);
		context.set("password_hash", password_hash);
		context.set("is_password_set", is_password_set);
		context.set("type", employee.type);
		context.set("user_id", userId);
		context.set("client_id", client_id);
		context.set("debug_client_name", debug_client_name);
		context.set("debug_client_organization_name", debug_client_organization_name);
		context.set("vertical_id", vertical_id);
		context.set("debug_vertical_name", debug_vertical_name);
		if (isImpersonation) context.set("is_impersonation", true);

		await next();
	});
