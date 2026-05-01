import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { exportFaqCategoryRequestQueryValidator } from "@/modules/admin/validators/faq-category.validators.ts";
import { getFaqCategory } from "@/db/actions/faq-category.actions.ts";
import { json2csv } from "json-2-csv";
import type { PermissionLabelFor } from "@/types/common/permissions-set.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { Permission } from "@/utils/permission.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";

export const exportFaqCategoriesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	exportFaqCategoryRequestQueryValidator,
	ipMiddleware,
	async (context) => {
		const {
			query,
			fetch_all,
			category_state,
			question_status,
			vertical_id,
		} = context.req.valid("query");

		const { admin, role, ip } = context.var;

		const permsRequired: PermissionLabelFor<"support">[] = [];

		if (category_state === "active") {
			permsRequired.push(SUPPORT_PERMISSIONS.export_active_resources);
		} else if (category_state === "suspended") {
			permsRequired.push(SUPPORT_PERMISSIONS.export_suspended_categories);
		}

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: permsRequired,
			},
		});

		const data = await getFaqCategory({
			query,
			includeQuestions: true,
			questionType: question_status,
			fetchAll: fetch_all,
			state: category_state,
			vertical_id,
		});

		const csv = json2csv(data.faq_categories, {
			emptyFieldValue: null,
			delimiter: {
				field: ",",
				wrap: '"', // ensures commas in text are safely escaped
			},
		});

		services.adminLogger.log({
			module: "support_categories",
			action: "export",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
		});

		context.header("Content-Type", "text/csv; charset=utf-8");
		context.header(
			"Content-Disposition",
			`attachment; filename="clients.csv"`,
		);

		return context.body(csv);
	},
);
