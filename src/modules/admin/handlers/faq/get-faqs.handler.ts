import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getFaqsRequestQueryValidators } from "@/modules/admin/validators/faq.validators.ts";
import type { faq_question } from "@/db/types";
import { getFaqQuestions } from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import type { PermissionLabelFor } from "@/types/common/permissions-set.ts";

interface ResponseData {
	faqs: faq_question[];
	count: number;
}

export const getFaqsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getFaqsRequestQueryValidators,
	async (context) => {
		const {
			state,
			query,
			page_size,
			page_number,
			publishing_status,
			category_id,
		} = context.req.valid("query");

		const { admin } = context.var;

		const permsRequired: PermissionLabelFor<"support">[] = [];

		if (state === "active") {
			permsRequired.push(SUPPORT_PERMISSIONS.view_active_resources);
		} else if (state === "suspended") {
			permsRequired.push(SUPPORT_PERMISSIONS.view_suspended_categories);
		}

		Permission.checkAdminPermissions({
			admin,
			is_super_admin: state === "deleted",
			permissions_allowed: {
				support: permsRequired,
			},
		});

		const faqData = await getFaqQuestions({
			state,
			query,
			pageSize: page_size,
			publishing_status,
			pageNumber: page_number,
			category_id,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: faqData,
			},
			{
				status: 200,
			},
		);
	},
);
