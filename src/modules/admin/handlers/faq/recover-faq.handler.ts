import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { recoverFaqQuestionsRequestBodyValidator } from "@/modules/admin/validators/faq.validators.ts";
import {
	getFaqQuestions,
	toggleSuspendedFaqQuestions,
} from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const recoverFaqHandler = createHandlers(
	authGuard(["admin", "employee"]),
	recoverFaqQuestionsRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.edit_questions],
			},
		});

		const { ids } = context.req.valid("json");

		const updatedFaqs = await getFaqQuestions({
			ids,
		});

		await toggleSuspendedFaqQuestions({
			question_ids: ids,
			status: "active",
		});

		Promise.allSettled(
			updatedFaqs.faqs.map((faq) =>
				services.adminLogger.log({
					module: "FAQ",
					action: "update",
					admin_id: admin?.id,
					admin_name: `${admin?.first_name} ${admin?.last_name}`,
					role_id: admin?.role_id,
					role_name: role?.name,
					ip,
					effected_id: faq.id,
					effected_name: faq.question,
				}),
			),
		).then((r) => logger.info(r));

		return context.json<APIResponse>({
			success: true,
			code: 200,
		});
	},
);
