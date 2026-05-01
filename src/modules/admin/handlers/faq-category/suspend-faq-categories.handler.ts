import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { suspendFaqCategoriesRequestBodyValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import {
	getFaqCategory,
	toggleSuspendFaqCategories,
} from "@/db/actions/faq-category.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const suspendFaqCategoriesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	suspendFaqCategoriesRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.suspend_categories],
			},
		});

		const { categories } = context.req.valid("json");

		const categoriesToBeSuspended = await getFaqCategory({
			ids: categories,
			fetchAll: true,
		});

		await toggleSuspendFaqCategories({
			categories,
			status: "suspended",
		});

		Promise.allSettled(
			categoriesToBeSuspended.faq_categories.map((faq_category) =>
				services.adminLogger.log({
					module: "support_categories",
					action: "activate",
					admin_id: admin?.id,
					admin_name: `${admin?.first_name} ${admin?.last_name}`,
					role_id: admin?.role_id,
					role_name: role?.name,
					ip,
					effected_id: faq_category.id,
					effected_name: faq_category.name,
				}),
			),
		).then((r) => logger.info(r));

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
