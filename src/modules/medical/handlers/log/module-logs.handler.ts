import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { searchSystemLogsRequestBodyValidator, filterStructure } from "medical/validators/log.validators.ts";
import { LOG_CONFIG } from "@/configs/log.config.ts";

export const postDepartmentLogsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	searchSystemLogsRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json");

		const result = await getSystemLogs({
			...body,
			category: "Department",
			page_size: body.limit,
			client_id,
		});

		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "Department logs fetched successfully",
			data: {
				logs: result.logs,
				count: result.page_count,
				total: result.total_count,
			},
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count),
		});
	},
);

export const getDepartmentLogsDropdownsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "Department log dropdowns fetched",
			data: {
				filter_structure: filterStructure.Department,
				config: LOG_CONFIG.categories.Department,
			},
		}, 200);
	},
);

export const postEmployeeLogsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
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

		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "Employee logs fetched successfully",
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count),
		});
	},
);

export const getEmployeeLogsDropdownsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "Employee log dropdowns fetched",
			data: {
				filter_structure: filterStructure.Employee,
				config: LOG_CONFIG.categories.Employee,
			},
		}, 200);
	},
);

export const postGrubpacLogsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
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

		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "GrubPac logs fetched successfully",
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count),
		});
	},
);

export const getGrubpacLogsDropdownsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "Grubpac log dropdowns fetched",
			data: {
				filter_structure: {
					system_logs: Array.from(new Set([...filterStructure.GrubPac.system_logs, ...filterStructure.GrubLock.system_logs])),
					action_logs: Array.from(new Set([...filterStructure.GrubPac.action_logs, ...filterStructure.GrubLock.action_logs])),
				},
				config: LOG_CONFIG.categories.GrubPac,
			},
		}, 200);
	},
);

export const postGrublockLogsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
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

		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "GrubLock logs fetched successfully",
			data: { logs: result.logs, count: result.page_count, total: result.total_count },
			pagination: calculatePagination(result.page || 1, result.page_size || result.total_count, result.total_count),
		});
	},
);

export const getGrublockLogsDropdownsHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	async (context) => {
		return context.json<APIResponse<unknown>>({
			success: true,
			code: 200,
			message: "GrubLock log dropdowns fetched",
			data: {
				filter_structure: filterStructure.GrubLock,
				config: LOG_CONFIG.categories.GrubLock,
			},
		}, 200);
	},
);
