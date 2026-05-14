import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { suspendAdminsRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import { getAdmins, toggleSuspendAdmins } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const suspendAdminsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	suspendAdminsRequestBodyValidator,
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
				employees: [EMPLOYEES_PERMISSIONS.suspend_employees],
			},
		});

		const { admins } = context.req.valid("json");

		if (admins.includes(user_id)) {
			throw new APIError("You cannot suspend your own account", undefined, undefined, 403);
		}

		const uniqueAdmins = Array.from(new Set(admins));

		const adminsToBeSuspended = await getAdmins({
			ids: uniqueAdmins,
			fetchAll: true,
		});

		if (adminsToBeSuspended.admins.length !== uniqueAdmins.length) {
			throw new APIError("One or more of the selected accounts does not exist", undefined, undefined, 404);
		}

		const alreadySuspended = adminsToBeSuspended.admins.filter(
			(admin) => admin.status === "suspended",
		);

		if (alreadySuspended.length > 0) {
			throw new APIError(
				"One or more of the selected accounts are already suspended",
				undefined,
				undefined,
				400,
			);
		}

		if (!loggedInAdminRole?.is_super_admin) {
			const hasSuperAdmin = adminsToBeSuspended.admins.some((a) => a.role?.is_super_admin);
			if (hasSuperAdmin) {
				throw new APIError("Unauthorized: You cannot suspend a Super Admin", undefined, undefined, 403);
			}
		}

		await toggleSuspendAdmins({
			admin_ids: uniqueAdmins,
			state: "suspended",
		});

		Promise.allSettled(
			adminsToBeSuspended.admins.map((admin) =>
				services.adminLogger.log({
					module: "employee",
					action: "suspend",
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
