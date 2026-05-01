import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getRolesRequestQueryValidator } from "@/modules/admin/validators/role.validators.ts";
import type { role } from "@/db/types";
import { getRoles } from "@/db/actions/roles.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";

interface ResponseData {
	roles: role[];
	count: number;
}

export const getRolesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getRolesRequestQueryValidator,
	async (context) => {
		const { admin } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				roles: ["view roles"],
			},
		});

		const { query, page_number, page_size, hide_assigned } =
			context.req.valid("query");

		const rolesData = await getRoles({
			query,
			pageSize: page_size,
			pageNumber: page_number,
			hideAssigned: hide_assigned,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: rolesData,
			},
			{
				status: 200,
			},
		);
	},
);
