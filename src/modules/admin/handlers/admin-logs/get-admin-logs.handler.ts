import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getAdminLogsRequestQueryValidators } from "@/modules/admin/validators/log.validators.ts";
import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";

export const getAdminLogsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getAdminLogsRequestQueryValidators,
	async (context) => {
		const {
			search,
			page,
			limit,
			end_date,
			start_date,
			category,
			type,
			admin_id,
		} = context.req.valid("query");

		const result = await getSystemLogs({
			category: category as any,
			type: type as any,
			search,
			page,
			page_size: limit,
			start_date,
			end_date,
			actor_id: admin_id,
		});

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				message: "Admin logs fetched successfully",
				data: result.logs,
				meta: {
					page: result.page || 1,
					limit: result.page_size || result.total_count,
					total_count: result.total_count,
					total_pages: Math.ceil(result.total_count / (result.page_size || 10)),
				},
			},
			{
				status: 200,
			},
		);
	},
);
