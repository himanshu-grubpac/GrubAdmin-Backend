import { prisma } from "@/db";
import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { assignBulkRoleRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import { assignBulkRole, getAdmins } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const assignBulkRoleHandler = createHandlers(
	authGuard(["admin", "employee"]),
	assignBulkRoleRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const {
			admin: loggedInAdmin,
			role: loggedInAdminRole,
			ip,
		} = context.var;

		Permission.checkAdminPermissions({
			admin: loggedInAdmin,
			permissions_allowed: {
				employees: [EMPLOYEES_PERMISSIONS.edit_employees],
			},
		});

		const { role, admins } = context.req.valid("json");

		const targetRole = await prisma.role.findFirst({
			where: { id: role, status: "active" },
		});

		if (!targetRole) {
			throw new APIError("Selected role is invalid, inactive or deleted", undefined, undefined, 400);
		}

		if (targetRole.is_super_admin && !loggedInAdminRole?.is_super_admin) {
			throw new APIError("Unauthorized: Only a Super Admin can assign the Super Admin role", undefined, undefined, 403);
		}

		if (admins.includes(loggedInAdmin?.id)) {
			throw new APIError("You cannot change your own role via bulk assignment", undefined, undefined, 403);
		}

		const adminsToBeAssignedRoles = await getAdmins({
			ids: admins,
			fetchAll: true,
		});

		await assignBulkRole({
			admin_ids: admins,
			role_id: role,
		});

		Promise.allSettled(
			adminsToBeAssignedRoles.admins.map((admin) =>
				services.adminLogger.log({
					module: "employee",
					action: "update",
					admin_id: loggedInAdmin?.id,
					admin_name: `${loggedInAdmin?.first_name} ${loggedInAdmin?.last_name}`,
					role_id: loggedInAdmin?.role_id,
					role_name: loggedInAdminRole?.name,
					ip,
					effected_id: admin.id,
					effected_name: `${admin?.first_name} ${admin?.last_name}`,
				}),
			),
		).then((r) => logger.info(r));

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
