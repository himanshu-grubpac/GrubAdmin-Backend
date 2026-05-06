import { prisma } from "@/db";
import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { updateAdminRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import { updateAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
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
		if (data.email) data.email = data.email.toLowerCase().trim();
		if (data.employee_id) data.employee_id = data.employee_id.trim();

		if (data.role && data.id === loggedInAdmin.id) {
			throw new APIError("You cannot change your own role", undefined, undefined, 403);
		}

		if (data.role) {
			const targetRole = await prisma.role.findFirst({
				where: { id: data.role, status: "active" },
			});

			if (!targetRole) {
				throw new APIError("Selected role is invalid, inactive or deleted", undefined, undefined, 400);
			}

			if (targetRole.is_super_admin && !loggedInAdminRole?.is_super_admin) {
				throw new APIError("Unauthorized: Only a Super Admin can assign the Super Admin role", undefined, undefined, 403);
			}
		}

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
