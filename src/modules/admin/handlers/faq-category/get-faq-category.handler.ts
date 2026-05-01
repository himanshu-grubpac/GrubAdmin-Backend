import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getFaqCategoryRequestQueryValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import { getFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { faq_category } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import type { PermissionLabelFor } from "@/types/common/permissions-set.ts";

interface ResponseData {
	faq_categories: faq_category[];
	count: number;
}

export const getFaqCategoryHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getFaqCategoryRequestQueryValidator,
	async (context) => {
		const { query, category_state, include_questions } =
			context.req.valid("query");

		const { admin } = context.var;

		const permsRequired: PermissionLabelFor<"support">[] = [];

		if (category_state === "active") {
			permsRequired.push(SUPPORT_PERMISSIONS.view_active_resources);
		} else if (category_state === "suspended") {
			permsRequired.push(SUPPORT_PERMISSIONS.view_suspended_categories);
		}

		Permission.checkAdminPermissions({
			admin,
			is_super_admin: category_state === "deleted",
			permissions_allowed: {
				support: permsRequired,
			},
		});

		const faqCategoriesData = await getFaqCategory({
			state: category_state,
			query,
			includeQuestions: include_questions,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: faqCategoriesData,
			},
			{
				status: 200,
			},
		);
	},
);
