import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteVerticalParamValidator } from "@/modules/admin/validators/vertical.validators.ts";
import { deleteVertical } from "@/db/actions/vertical.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

export const deleteVerticalHandler = createHandlers(
	authGuard(["admin", "employee"]),
	deleteVerticalParamValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role: adminRole, ip } = context.var;

		if (!adminRole?.is_super_admin) {
			throw new APIError(
				"Only Super Admin can delete verticals",
				undefined,
				undefined,
				403,
			);
		}

		const { id } = context.req.valid("param");

		const vertical = await deleteVertical(id);

		services.adminLogger.log({
			module: "verticals",
			action: "delete",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name || ""}`.trim(),
			role_id: admin?.role_id,
			role_name: adminRole?.name,
			ip,
			effected_id: vertical.id,
			effected_name: vertical.name,
		});

		return context.json(
			{
				success: true,
				message: "Vertical deleted successfully",
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
