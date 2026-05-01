import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { updateFaqRequestBodyValidator } from "@/modules/admin/validators/faq.validators.ts";
import type { faq_question } from "@/db/types";
import { updateFaqQuestion } from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { Permission } from "@/utils/permission.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	faq: faq_question;
}

export const updateFaqHandler = createHandlers(
	authGuard(["admin", "employee"]),
	updateFaqRequestBodyValidator,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.edit_questions],
			},
		});

		const { id, question, answer } = context.req.valid("json");

		const faq = await updateFaqQuestion({
			answer,
			question,
			id,
		});

		if (!faq) {
			throw new APIError("No faq found!", undefined, undefined, 404);
		}

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
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				faq,
			},
		});
	},
);
