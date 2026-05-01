import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteFaqCategoriesRequestBodyValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import {
	deleteFaqCategories,
	getFaqCategory,
} from "@/db/actions/faq-category.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const deleteFaqCategoriesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	deleteFaqCategoriesRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.delete_categories],
			},
		});

		const { categories } = context.req.valid("json");

		const categoriesToBeDeleted = await getFaqCategory({
			ids: categories,
			fetchAll: true,
		});

		await deleteFaqCategories({
			categories,
		});

		Promise.allSettled(
			categoriesToBeDeleted.faq_categories.map((faq_category) =>
				services.adminNotifications.notifyDeletion({
					itemType: "FAQ Category",
					itemName: faq_category.name ?? "",
					itemId: faq_category.id,
					employeeName: admin?.first_name ?? "",
					employeeId: admin?.id ?? "",
				}),
			),
		).then((r) => logger.info(r));

		Promise.allSettled(
			categoriesToBeDeleted.faq_categories.map((faq_category) =>
				services.adminLogger.log({
					module: "support_categories",
					action: "delete",
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

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);
