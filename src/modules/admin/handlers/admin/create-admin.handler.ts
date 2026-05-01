import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createAdminRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import type { admin } from "@/db/types";
import { createAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { services } from "@/services";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	admin: admin;
}

export const createAdminHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createAdminRequestBodyValidator,
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
				employees: [EMPLOYEES_PERMISSIONS.add_employees],
			},
		});

		const {
			role,
			first_name,
			last_name,
			email,
			country_code,
			mobile_number,
			joining_date,
			location,
			employee_id,
		} = context.req.valid("json");

		const admin = await createAdmin({
			role_id: role,
			first_name,
			email,
			country_code,
			mobile_number,
			joining_date,
			location,
			employee_id,
			last_name,
		});

		services.adminLogger.log({
			module: "employee",
			action: "create",
			admin_id: loggedInAdmin?.id,
			admin_name: `${loggedInAdmin?.first_name} ${loggedInAdmin?.last_name}`,
			role_id: loggedInAdmin?.role_id,
			role_name: loggedInAdminRole?.name,
			ip,
			effected_id: admin.id,
			effected_name: `${admin?.first_name} ${admin?.last_name}`,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					admin,
				},
			},
			{
				status: 200,
			},
		);
	},
);
