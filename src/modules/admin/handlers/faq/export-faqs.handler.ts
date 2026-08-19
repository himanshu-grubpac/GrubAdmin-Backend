import { authGuard } from "@/middlewares/auth";
import { exportFaqsRequestQueryValidators } from "@/modules/admin/validators/faq.validators.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { getFaqQuestions } from "@/db/actions/faq.actions.ts";
import { json2csv } from "json-2-csv";
import { Permission } from "@/utils/permission.ts";
import { SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { services } from "@/services";
import { sanitizeCsvValue } from "@/utils/string.ts";
import { ADMIN_EXPORT_MAX_ROWS } from "@/modules/admin/configs/admin-export-limits.ts";

export const exportFaqsHandler = createHandlers(
	authGuard(["employee", "admin"]),
	exportFaqsRequestQueryValidators,
	ipMiddleware,
	async (context) => {
		const { category_id, publishing_status } = context.req.valid("query");

		const { admin, ip, role } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.export_active_resources],
			},
		});

		const faqs = await getFaqQuestions({
			category_id,
			publishing_status,
			state: "active",
			pageNumber: 1,
			pageSize: ADMIN_EXPORT_MAX_ROWS,
		});

		const sanitizedFaqs = faqs.faqs.map((f) => sanitizeCsvValue(f));

		const csv = json2csv(sanitizedFaqs, {
			emptyFieldValue: null,
			delimiter: {
				field: ",",
				wrap: '"', // ensures commas in text are safely escaped
			},
		});

		services.adminLogger.log({
			module: "FAQ",
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
			`attachment; filename="faqs.csv"`,
		);

		return context.body(csv);
	},
);
