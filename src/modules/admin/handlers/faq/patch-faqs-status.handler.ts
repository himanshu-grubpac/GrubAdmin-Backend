import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { updateFaqsPublishingStatusRequestBodyValidator } from "@/modules/admin/validators/faq.validators.ts";
import {
	getFaqQuestions,
	updateFaqQuestionsPublishingStatus,
} from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";

export const patchFAQStatusHandler = createHandlers(
	authGuard(["admin", "employee"]),
	updateFaqsPublishingStatusRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.allow_publishing],
			},
		});

		const { ids, publishing_status } = context.req.valid("json");

		const updatedFaqs = await getFaqQuestions({
			ids,
		});

		await updateFaqQuestionsPublishingStatus({
			questionIds: ids,
			publishing_status,
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
