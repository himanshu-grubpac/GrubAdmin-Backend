import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getAdminsRequestQueryValidator } from "@/modules/admin/validators/admin.validators.ts";
import { type admin, type admin_dismissed, type Prisma } from "@/db/types";
import { getAdmins, getDismissedAdmins } from "@/db/actions/admin.actions.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import type { PermissionLabelFor } from "@/types/common/permissions-set.ts";

interface ResponseData {
	admins: admin[] | admin_dismissed[];
	count: number;
}

export const getAdminsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getAdminsRequestQueryValidator,
	async (context) => {
		const { admin: loggedInAdmin } = context.var;

		const { query, status, page_number, page_size, role } =
			context.req.valid("query");

		const permissionsAllowed: PermissionLabelFor<"employees">[] = [];

		if (status === "unassigned" || status === "active") {
			permissionsAllowed.push(
				EMPLOYEES_PERMISSIONS.view_active_employees,
			);
		}

		if (status === "suspended") {
			permissionsAllowed.push(
				EMPLOYEES_PERMISSIONS.view_suspended_employees,
			);
		}

		if (status === "dismissed") {
			permissionsAllowed.push(
				EMPLOYEES_PERMISSIONS.view_dismissed_employees,
			);
		}

		Permission.checkAdminPermissions({
			admin: loggedInAdmin,
			permissions_allowed: {
				employees: permissionsAllowed,
			},
		});

		const adminsData =
			status === "dismissed"
				? await getDismissedAdmins({
						query,
						role: typeof role === "string" ? [role] : role,
						excludeRoles: true,
						pageNumber: page_number,
						pageSize: page_size,
					})
				: await getAdmins({
						query,
						role_id: typeof role === "string" ? [role] : role,
						status: status ?? "active",
						pageSize: page_size,
						pageNumber: page_number,
					});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: adminsData,
				pagination: calculatePagination(page_number, page_size, adminsData.count),
			},
			{
				status: 200,
			},
		);
	},
);
