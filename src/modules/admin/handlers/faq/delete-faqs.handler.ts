import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteFaqsRequestBodyValidator } from "@/modules/admin/validators/faq.validators.ts";
import {
	deleteFaqQuestions,
	getFaqQuestions,
} from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const deleteFaqsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	deleteFaqsRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.delete_question],
			},
		});

		const { ids } = context.req.valid("json");

		const deletedFaqs = await getFaqQuestions({
			ids,
		});

		await deleteFaqQuestions(ids);

		await Promise.allSettled(
			deletedFaqs.faqs.map((faq) =>
				services.adminNotifications.notifyDeletion({
					itemType: "FAQ",
					itemName: faq.question ?? "",
					itemId: faq.id,
					employeeName: admin?.first_name ?? "",
					employeeId: admin?.id ?? "",
				}),
			),
		);

		await Promise.allSettled(
			deletedFaqs.faqs.map((faq) =>
				services.adminLogger.log({
					module: "FAQ",
					action: "delete",
					admin_id: admin?.id,
					admin_name: `${admin?.first_name} ${admin?.last_name}`,
					role_id: admin?.role_id,
					role_name: role?.name,
					ip,
					effected_id: faq.id,
					effected_name: faq.question,
				}),
			),
		);

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
