import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createRoleRequestBodyValidator } from "@/modules/admin/validators/role.validators.ts";
import { createRole } from "@/db/actions/roles.actions.ts";
import type { role } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { CustomValidator } from "@/utils/custom-validator.ts";
import { Permission } from "@/utils/permission.ts";
import { services } from "@/services";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	role: role;
}

export const createRoleHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createRoleRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role: adminRole, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				roles: ["add roles"],
			},
		});

		const { name, permissions } = context.req.valid("json");

		const role = await createRole({
			name,
			permissions,
		});

		services.adminLogger.log({
			module: "role",
			action: "create",
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
