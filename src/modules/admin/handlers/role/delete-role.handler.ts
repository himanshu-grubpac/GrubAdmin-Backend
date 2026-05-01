import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteRoleRequestParamValidator } from "@/modules/admin/validators/role.validators.ts";
import { deleteRole } from "@/db/actions/roles.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

export const deleteRoleHandler = createHandlers(
	authGuard(["admin", "employee"]),
	deleteRoleRequestParamValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role: adminRole, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				roles: ["delete roles"],
			},
		});

		const { id } = context.req.valid("param");

		const role = await deleteRole({
			id,
		});

		if (!role) {
			throw new APIError("No role found!", undefined, undefined, 404);
		}

		services.adminNotifications.notifyDeletion({
			itemType: "Role",
			itemName: role.name ?? "",
			itemId: role.id,
			employeeName: admin?.first_name ?? "",
			employeeId: admin?.id ?? "",
		});

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

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
