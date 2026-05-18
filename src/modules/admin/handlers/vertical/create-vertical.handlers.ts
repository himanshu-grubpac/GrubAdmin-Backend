import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createVerticalRequestBodyValidator } from "@/modules/admin/validators/vertical.validators.ts";
import { createVertical } from "@/db/actions/vertical.actions.ts";
import type { vertical } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { services } from "@/services";

interface ResponseData {
	vertical: vertical;
}

export const createVerticalHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createVerticalRequestBodyValidator,
	async (context) => {
		const { admin, role: adminRole, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				verticals: ["add verticals"],
			},
		});

		const { name } = context.req.valid("json");

		const vertical = await createVertical({
			name,
		});


		services.adminLogger.log({
			module: "verticals",
			action: "create",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name || ""}`.trim(),
			role_id: admin?.role_id,
			role_name: adminRole?.name,
			ip,
			effected_id: vertical.id,
			effected_name: vertical.name,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					vertical,
				},
			},
			{
				status: 200,
			},
		);
	},
);
