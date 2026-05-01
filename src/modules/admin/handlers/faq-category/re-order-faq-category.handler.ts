import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { reorderCategoriesRequestBodyValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import { reorderFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

export const reorderFaqCategoryHandler = createHandlers(
	authGuard(["employee", "admin"]),
	reorderCategoriesRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.change_faq_category],
			},
		});

		const { order } = context.req.valid("json");

		await reorderFaqCategory({ order });

		services.adminLogger.log({
			module: "support_categories",
			action: "re-order",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
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
