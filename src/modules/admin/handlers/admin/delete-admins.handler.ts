import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteAdminsRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import { APIError } from "@/types/error";
import { deleteAdmins, getAdmins } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

export const deleteAdminsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	deleteAdminsRequestBodyValidator,
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
				employees: [EMPLOYEES_PERMISSIONS.delete_employees],
			},
		});

		const { user_id } = context.var;

		const { admins } = context.req.valid("json");

		if (admins.includes(user_id)) {
			throw new APIError("You cannot delete your own account", undefined, undefined, 403);
		}

		const uniqueAdmins = Array.from(new Set(admins));

		const adminsToBeDeleted = await getAdmins({
			ids: uniqueAdmins,
			fetchAll: true,
		});

		if (adminsToBeDeleted.admins.length !== uniqueAdmins.length) {
			throw new APIError("One or more of the selected accounts does not exist", undefined, undefined, 404);
		}

		if (!loggedInAdminRole?.is_super_admin) {
			const hasSuperAdmin = adminsToBeDeleted.admins.some((a) => a.role?.is_super_admin);
			if (hasSuperAdmin) {
				throw new APIError("Unauthorized: You cannot delete a Super Admin", undefined, undefined, 403);
			}
		}

		await deleteAdmins(uniqueAdmins);

		await Promise.allSettled(
			adminsToBeDeleted.admins.map((admin) =>
				services.adminNotifications.notifyDeletion({
					itemType: "Employee",
					itemName: admin.first_name ?? "",
					itemId: admin.id,
					employeeName: loggedInAdmin?.first_name ?? "",
					employeeId: loggedInAdmin?.id ?? "",
				}),
			),
		);

		await Promise.allSettled(
			adminsToBeDeleted.admins.map((admin) =>
				services.adminLogger.log({
					module: "employee",
					action: "delete",
					admin_id: loggedInAdmin?.id,
					admin_name: `${loggedInAdmin?.first_name} ${loggedInAdmin?.last_name}`,
					role_id: loggedInAdmin?.role_id,
					role_name: loggedInAdminRole?.name,
					ip,
					effected_id: admin.id,
					effected_name: `${admin?.first_name} ${admin?.last_name}`,
				}),
			),
		);

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
