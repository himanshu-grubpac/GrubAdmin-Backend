import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getSystemLogsRequestQueryValidator, searchSystemLogsRequestBodyValidator, categoriesEnum, typesEnum, categoryToTypes, filterStructure } from "delivery/validators/log.validators.ts";
import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { resolveMessageTemplate } from "@/utils/message";
import { LOG_CONFIG } from "@/configs/log.config.ts";

export const getSystemLogsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	getSystemLogsRequestQueryValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const { 
			category, 
			type, 
			actor_id, 
			subject_id, 
			search, 
			start_date, 
			end_date, 
			page, 
			limit 
		} = context.req.valid("query");

		const result = await getSystemLogs({
			category,
			type,
			actor_id,
			subject_id,
			search,
			start_date,
			end_date,
			page,
			page_size: limit,
			client_id,
			vertical_id,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
			message: "Logs fetched successfully",
			data: {
				logs: result.logs,
				count: result.page_count,
				total: result.total_count,
			},
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count),
		};

		return context.json<APIResponse<any>>(response, response.code as any);
	},
);

export const searchSystemLogsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const { 
			filters, 
			actor_id, 
			subject_id, 
			search, 
			start_date, 
			end_date, 
			page, 
			limit 
		} = context.req.valid("json");

		const result = await getSystemLogs({
			filters,
			actor_id,
			subject_id,
			search,
			start_date,
			end_date,
			page,
			page_size: limit,
			client_id,
			vertical_id,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
			message: "Logs fetched successfully",
			data: {
				logs: result.logs,
				count: result.page_count,
				total: result.total_count,
			},
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count),
		};

		return context.json<APIResponse<any>>(response, response.code as any);
	},
);

export const getLogDropdownsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	async (context) => {
		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
			message: "Log dropdowns fetched successfully",
			data: {
				categories: categoriesEnum as unknown as string[],
				types: typesEnum as unknown as string[],
				mapping: categoryToTypes,
				filter_structure: filterStructure,
				config: LOG_CONFIG,
			},
		};

		return context.json<APIResponse<{ categories: string[], types: string[], mapping: Record<string, string[]>, filter_structure: any }>>(
			response,
			response.code as any
		);
	},
);
