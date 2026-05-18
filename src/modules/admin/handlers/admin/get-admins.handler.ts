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

		if (status === "unassigned" || status === "active" || status === "all") {
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
						excludeRoles: false,
						pageNumber: page_number,
						pageSize: page_size,
					})
				: status === "all"
				? await (async () => {
						const activeRes = await getAdmins({
							query,
							role_id: typeof role === "string" ? [role] : role,
							fetchAll: true,
						});
						const dismissedRes = await getDismissedAdmins({
							query,
							role: typeof role === "string" ? [role] : role,
							excludeRoles: false,
							fetchAll: true,
						});

						const processedDismissed = dismissedRes.admins.map((a) => ({
							...a,
							status: "dismissed" as const,
						}));

						const combined = [
							...activeRes.admins,
							...processedDismissed,
						];

						const total = combined.length;
						const paginated = combined.slice(
							(page_number - 1) * page_size,
							page_number * page_size,
						);

						return {
							admins: paginated,
							count: total,
						};
				  })()
				: await getAdmins({
						query,
						role_id: typeof role === "string" ? [role] : role,
						status: status ?? "active",
						pageSize: page_size,
						pageNumber: page_number,
					});

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				data: {
					admins: adminsData.admins,
					total: adminsData.count,
				},
				meta: {
					page: page_number,
					limit: page_size,
					total_count: adminsData.count,
					total_pages: Math.ceil(adminsData.count / page_size),
				},
			},
			{
				status: 200,
			},
		);
	},
);
