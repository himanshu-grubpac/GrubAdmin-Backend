import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { updateFaqCategoryRequestBodyValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import { updateFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { faq_category } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

interface ResponseData {
	category: faq_category;
}

export const updateFaqCategoryHandler = createHandlers(
	authGuard(["admin", "employee"]),
	updateFaqCategoryRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.edit_category],
			},
		});

		const { name, description, id, icon, vertical } =
			context.req.valid("json");

		const category = await updateFaqCategory({
			id,
			name,
			description,
			icon,
			vertical,
		});

		services.adminLogger.log({
			module: "support_categories",
			action: "update",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: category.id,
			effected_name: category.name,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				category,
			},
		});
	},
);
