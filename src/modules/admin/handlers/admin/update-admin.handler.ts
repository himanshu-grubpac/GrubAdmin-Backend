import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { updateAdminRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import { updateAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

export const updateAdminHandler = createHandlers(
	authGuard(["admin", "employee"]),
	updateAdminRequestBodyValidator,
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

		const data = context.req.valid("json");

		const updatedAdmin = await updateAdmin({
			id: data.id,
			data: {
				email: data.email,
				country_code: data.country_code,
				mobile_number: data.mobile_number,
				first_name: data.first_name,
				last_name: data.last_name,
				role: data.role
					? {
							connect: {
								id: data.role,
							},
						}
					: undefined,
				joining_date: data.joining_date,
				location: data.location,
				employee_id: data.employee_id,
			},
		});

		services.adminLogger.log({
			module: "employee",
			action: "update",
			admin_id: loggedInAdmin?.id,
			admin_name: `${loggedInAdmin?.first_name} ${loggedInAdmin?.last_name}`,
			role_id: loggedInAdmin?.role_id,
			role_name: loggedInAdminRole?.name,
			ip,
			effected_id: updatedAdmin.id,
			effected_name: `${updatedAdmin?.first_name} ${updatedAdmin?.last_name}`,
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
