import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createFaqCategoryRequestBodyValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import type { faq_category } from "@/db/types";
import { createFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

interface ResponseData {
	faq_category: faq_category;
}

export const createFaqCategoryHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createFaqCategoryRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.add_new_category],
			},
		});

		const { name, vertical, icon, description } = context.req.valid("json");

		const faqCategory = await createFaqCategory({
			icon,
			vertical,
			description,
			name,
		});

		services.adminLogger.log({
			module: "support_categories",
			action: "create",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: faqCategory.id,
			effected_name: faqCategory.name,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					faq_category: faqCategory,
				},
			},
			{
				status: 200,
			},
		);
	},
);
