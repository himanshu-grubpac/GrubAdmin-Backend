import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import {
	updateRoleRequestBodyValidator,
	updateRoleRequestParamValidator,
} from "@/modules/admin/validators/role.validators.ts";
import type { role } from "@/db/types";
import { updateRole } from "@/db/actions/roles.actions.ts";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

interface ResponseData {
	role: role;
}

export const updateRoleHandler = createHandlers(
	authGuard(["employee", "admin"]),
	updateRoleRequestParamValidator,
	updateRoleRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role: adminRole, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				roles: ["edit roles"],
			},
		});

		const { id } = context.req.valid("param");
		const { name, permissions, is_super_admin } = context.req.valid("json");

		const existingRole = await prisma.role.findUnique({
			where: { id },
		});

		if (!existingRole || existingRole.status === "deleted") {
			throw new APIError("Role not found", undefined, undefined, 404);
		}

		if (is_super_admin === true && !adminRole?.is_super_admin) {
			throw new APIError("Unauthorized: Only a Super Admin can create a Super Admin role", undefined, undefined, 403);
		}

		if (existingRole.is_super_admin && !adminRole?.is_super_admin) {
			throw new APIError("Unauthorized: Only a Super Admin can modify a Super Admin role", undefined, undefined, 403);
		}

		if (permissions && !adminRole?.is_super_admin) {
			Permission.assertPermissionsSubset(
				adminRole?.permissions_json as Record<string, string[]>,
				permissions as Record<string, string[]>,
			);
		}

		const role = await updateRole({
			id,
			name,
			permissions,
			isSuperAdmin: is_super_admin,
		});

		if (!role) {
			throw new APIError("No roles found or updated!", undefined, undefined, 404);
		}

		services.adminLogger.log({
			module: "role",
			action: "update",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: adminRole?.name,
			ip,
			effected_id: role.id,
			effected_name: role.name,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					role,
				},
			},
			{
				status: 200,
			},
		);
	},
);
