import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { reactivateAdminsRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import { getAdmins, toggleSuspendAdmins } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const reactivateAdminsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	reactivateAdminsRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const {
			admin: loggedInAdmin,
			user_id,
			role: loggedInAdminRole,
			ip,
		} = context.var;

		Permission.checkAdminPermissions({
			admin: loggedInAdmin,
			permissions_allowed: {
				employees: [EMPLOYEES_PERMISSIONS.edit_employees],
			},
		});

		const { admins } = context.req.valid("json");

		if (admins.includes(user_id)) {
			throw new APIError("You cannot reactivate yourself", undefined, undefined, 400);
		}

		const adminsToBeReactivated = await getAdmins({
			ids: admins,
			fetchAll: true,
		});

		await toggleSuspendAdmins({
			admin_ids: admins,
			state: "active",
		});

		Promise.allSettled(
			adminsToBeReactivated.admins.map((admin) =>
				services.adminLogger.log({
					module: "employee",
					action: "activate",
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
