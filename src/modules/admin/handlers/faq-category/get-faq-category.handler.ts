import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getFaqCategoryRequestQueryValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import { getFaqCategory } from "@/db/actions/faq-category.actions.ts";
import type { APIResponse } from "@/types/api";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import type { PermissionLabelFor } from "@/types/common/permissions-set.ts";
import { enrichFaqCategoriesResponse } from "@/utils/asset-url.ts";

interface ResponseData {
	faq_categories: (Record<string, unknown> & { icon_url: string })[];
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

		const enrichedCategories = await enrichFaqCategoriesResponse(faqCategoriesData.faq_categories as any);

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					faq_categories: enrichedCategories,
					count: faqCategoriesData.count,
				},
			},
			{
				status: 200,
			},
		);
	},
);
