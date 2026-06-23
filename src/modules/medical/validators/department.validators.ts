import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

export const createDepartmentRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a name",
			})
			.trim()
			.min(1, "Name is required")
			.max(100, "Name cannot exceed 100 characters"),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.default("active"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getDepartmentByIdRequestParamsValidator = zValidator(
	"param",
	z.object({
		id: z.ulid("Please provide a valid id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getDepartmentsRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().min(2, "Query must be at least 2 characters").optional(),
		search: z.string().trim().min(2, "Search must be at least 2 characters").optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).max(100, "Page size cannot exceed 100").optional(),
		limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").optional(),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.nullable()
			.optional()
			.or(z.literal("")),
		group_by: z.enum(["boxes"]).optional(),
		manager: z.coerce.boolean("Please provide a boolean value").optional(),
		delivery: z.coerce.boolean("Please provide a boolean value").optional(),
		box: z.coerce.boolean("Please provide a boolean value").optional(),
		group_by_selected_table: z.string().optional(),
	}).transform((data) => ({
		...data,
		page: data.page ?? data.page_number ?? 1,
		limit: data.limit ?? data.page_size ?? undefined,
		query: data.query ?? data.search,
	})),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const searchDepartmentRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().min(2, "Query must be at least 2 characters").optional(),
		search: z.string().trim().min(2, "Search must be at least 2 characters").optional(),
		limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").optional(),
		status: z.string().optional().default("all"),
	}).transform((data) => ({
		...data,
		limit: data.limit ?? undefined,
		query: data.query ?? data.search,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const editDepartmentRequestParamsValidator = zValidator(
	"param",
	z.object({
		id: z.ulid("Please provide a valid id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const editDepartmentRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid department id"),
		name: z
			.string({ error: "Please provide a name" })
			.trim()
			.min(1, "Name is required")
			.optional(),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const suspendDepartmentResourcesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid id").array().min(1, "Please provide at least one department id"),
		resource_status: z.enum(["suspend", "assign"]).default("suspend"),
		destination_department_id: z.string().ulid().nullable().optional().or(z.literal("")),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reassignDepartmentRequestBodyValidator = zValidator(
	"json",
	z.object({
		department_ids: z.ulid("Please provide a valid source department id").array().min(1, "Please provide at least one department id"),
		destination_department_id: z.string().ulid().nullable().optional().or(z.literal("")),
		reassign_employees: z.boolean().default(true),
		reassign_boxes: z.boolean().default(true),
	}).refine(
		(data) => {
			if (
				data.destination_department_id &&
				data.department_ids.includes(data.destination_department_id)
			) {
				return false;
			}
			return true;
		},
		{
			message: "Destination department cannot be one of the source departments to reassign",
			path: ["destination_department_id"],
		}
	),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const assignEmployeesRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid department id"),
		employee_ids: z.ulid("Please provide a valid employee id").array().min(1, "Please provide at least one employee id"),
		role: z.enum(["manager", "delivery"], {
			error: "Please provide a valid role (manager or delivery)",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
