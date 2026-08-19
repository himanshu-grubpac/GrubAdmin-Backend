import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { searchSystemLogsRequestBodyValidator, filterStructure } from "hospitality/validators/log.validators.ts";
import { LOG_CONFIG } from "@/configs/log.config.ts";
import { PAGE_SIZE } from "@/configs/constants";
import { MAX_PAGE_SIZE } from "@/validators/pagination";
import {
	buildHospitalityLogDisplayContext,
	formatHospitalityGrubpacLogsForResponse,
} from "hospitality/utils/hospitality-log-display.ts";

// GrubPac Logs Handler
export const postGrubpacLogsHandler = createHandlers(
	hospitalityAuthGuard(),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");
		const page = body.page ?? 1;
		const page_size = Math.min(body.limit ?? PAGE_SIZE, MAX_PAGE_SIZE);

		const hasEmptyTypeFilter = body.filters?.some(
			(filter) => Array.isArray(filter.types) && filter.types.length === 0,
		);
		if (hasEmptyTypeFilter) {
			return context.json<APIResponse<any>>({
				success: true,
				code: 200,
				message: "GrubPac logs fetched successfully",
				data: { logs: [], count: 0, total: 0 },
				pagination: calculatePagination(page, page_size, 0),
			});
		}

		const result = await getSystemLogs({
			...body,
			category: "GrubPac",
			page,
			page_size,
			client_id,
		});

		const displayContext = await buildHospitalityLogDisplayContext(result.logs, client_id);
		const formattedLogs = formatHospitalityGrubpacLogsForResponse(result.logs, displayContext);

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "GrubPac logs fetched successfully",
			data: { logs: formattedLogs, count: result.page_count, total: result.total_count },
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
