import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { searchSystemLogsRequestBodyValidator, filterStructure } from "delivery/validators/log.validators.ts";
import { LOG_CONFIG } from "@/configs/log.config.ts";

/**
 * Module-specific log handlers (POST)
 */

// Restaurant Logs Handler
export const postRestaurantLogsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await getSystemLogs({
			...body,
			category: "Restaurant",
			page_size: body.limit,
			client_id,
		});

		return context.json<APIResponse<any>>({
			success: true, 
			code: 200, 
			message: "Restaurant logs fetched successfully", 
			data: { 
				logs: result.logs, 
				count: result.page_count,
				total: result.total_count,
			},
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count)
		});
	}
);

// Restaurant Logs Dropdown
export const getRestaurantLogsDropdownsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "Restaurant log dropdowns fetched",
			data: { 
				filter_structure: filterStructure.Restaurant,
				config: LOG_CONFIG.categories.Restaurant
			}
		}, 200 as any);
	}
);

// Employee Logs Handler
export const postEmployeeLogsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await getSystemLogs({
			...body,
			category: "Employee",
			page_size: body.limit,
			client_id,
		});

		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "Employee logs fetched successfully", 
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count)
		});
	}
);

// Employee Logs Dropdown
export const getEmployeeLogsDropdownsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "Employee log dropdowns fetched",
			data: { 
				filter_structure: filterStructure.Employee,
				config: LOG_CONFIG.categories.Employee
			}
		}, 200 as any);
	}
);

// GrubPac Logs Handler
export const postGrubpacLogsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await getSystemLogs({
			...body,
			category: ["GrubPac", "GrubLock"],
			page_size: body.limit,
			client_id,
		});

		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "GrubPac logs fetched successfully", 
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count)
		});
	}
);

// GrubPac Logs Dropdown
export const getGrubpacLogsDropdownsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "Grubpac log dropdowns fetched",
			data: { 
				filter_structure: {
					system_logs: Array.from(new Set([...filterStructure.GrubPac.system_logs, ...filterStructure.GrubLock.system_logs])),
					action_logs: Array.from(new Set([...filterStructure.GrubPac.action_logs, ...filterStructure.GrubLock.action_logs])),
				},
				config: LOG_CONFIG.categories.GrubPac
			}
		}, 200 as any);
	}
);

// GrubLock Logs Handler
export const postGrublockLogsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await getSystemLogs({
			...body,
			category: "GrubLock",
			page_size: body.limit,
			client_id,
		});

		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "GrubLock logs fetched successfully", 
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count)
		});
	}
);

// GrubLock Logs Dropdown
export const getGrublockLogsDropdownsHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<any>>({
			success: true, code: 200, message: "GrubLock log dropdowns fetched",
			data: { 
				filter_structure: filterStructure.GrubLock,
				config: LOG_CONFIG.categories.GrubLock
			}
		}, 200 as any);
	}
);
