import { prisma } from "@/db";
import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createAdminRequestBodyValidator } from "@/modules/admin/validators/admin.validators.ts";
import type { admin } from "@/db/types";
import { createAdmin } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
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

		const body = context.req.valid("json");
		body.email = body.email.toLowerCase().trim();
		if (body.employee_id) body.employee_id = body.employee_id.trim();

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
		} = body;

		const targetRole = await prisma.role.findFirst({
			where: { id: role, status: "active" },
		});

		if (!targetRole) {
			throw new APIError("Selected role is invalid, inactive or deleted", undefined, undefined, 400);
		}

		if (targetRole.is_super_admin && !loggedInAdminRole?.is_super_admin) {
			throw new APIError("Unauthorized: Only a Super Admin can assign the Super Admin role", undefined, undefined, 403);
		}

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
