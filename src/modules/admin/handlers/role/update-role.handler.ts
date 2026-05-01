import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import {
	updateRoleRequestBodyValidator,
	updateRoleRequestParamValidator,
} from "@/modules/admin/validators/role.validators.ts";
import type { role } from "@/db/types";
import { updateRole } from "@/db/actions/roles.actions.ts";
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
				roles: ["view roles"],
			},
		});

		const { id } = context.req.valid("param");
		const { name, is_super_admin, permissions } = context.req.valid("json");

		const role = await updateRole({
			id,
			name,
			isSuperAdmin: is_super_admin,
			permissions,
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
