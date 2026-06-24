import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { searchSystemLogsRequestBodyValidator, filterStructure } from "hospitality/validators/log.validators.ts";
import { LOG_CONFIG } from "@/configs/log.config.ts";

// GrubPac Logs Handler
export const postGrubpacLogsHandler = createHandlers(
	hospitalityAuthGuard(),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await getSystemLogs({
			...body,
			category: "GrubPac",
			page_size: body.limit,
			client_id,
		});

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "GrubPac logs fetched successfully",
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count)
		});
	}
);

// GrubPac Logs Dropdown
export const getGrubpacLogsDropdownsHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "Grubpac log dropdowns fetched",
			data: {
				filter_structure: filterStructure.GrubPac,
				config: LOG_CONFIG.categories.GrubPac
			}
		}, 200 as any);
	}
);
