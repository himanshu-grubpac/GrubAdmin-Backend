import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { PAGE_SIZE } from "@/configs/constants.ts";

// Common fields shared by both name-input strategies
const createEmployeeCommonFields = {
	email: z.string().trim().email("Please provide a valid email address").max(100, "Email cannot exceed 100 characters"),
	country_code: z
		.string({ error: "Please provide a valid country code" })
		.trim()
		.min(1, "Please provide a valid country code")
		.max(10, "Country code cannot exceed 10 characters"),
	mobile_number: z
		.string({ error: "Please provide a valid mobile number" })
		.trim()
		.min(7, "Please provide a valid mobile number")
		.max(20, "Mobile number cannot exceed 20 characters"),
	joining_date: z.coerce.date("Please provide a valid joining date"),
	employee_id: z
		.string({ error: "Please provide a valid employee id" })
		.trim()
		.min(1, "Employee id is required")
		.max(50, "Employee ID cannot exceed 50 characters"),
	role: z.union(
		[z.literal("manager"), z.literal("delivery")],
		"Please provide a valid role",
	),
	restaurant_id: z.ulid("Please provide a valid restaurant id").nullable().optional(),
};

export const createEmployeeRequestBodyValidator = zValidator(
	"json",
	z.union([
		// Strategy 1: full_name only (first_name / last_name must NOT be present)
		z.object({
			full_name: z
				.string()
				.trim()
				.min(1, "Please provide a full name"),
			...createEmployeeCommonFields,
		}),
		// Strategy 2: first_name (+ optional last_name), no full_name
		z.object({
			first_name: z
				.string()
				.trim()
				.min(1, "Please provide a first name")
				.max(50, "First name cannot exceed 50 characters"),
			last_name: z.string().trim().max(50, "Last name cannot exceed 50 characters").optional(),
			...createEmployeeCommonFields,
		}),
	]),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);


export const getEmployeesRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).optional(),
		limit: z.coerce.number().int().min(1).optional(),
		role: z
			.union([z.literal("manager"), z.literal("delivery"), z.literal("driver")], "Please provide a valid role")
			.nullable()
			.optional()
			.or(z.literal("")),
		"roles[]": z
			.union(
				[
					z
						.union([z.literal("manager"), z.literal("delivery"), z.literal("driver")])
						.array(),
					z.union([z.literal("manager"), z.literal("delivery"), z.literal("driver")]),
				],
				"Please provide a valid role",
			)
			.nullable()
			.optional()
			.or(z.literal("")),
		restaurant_id: z.string().ulid("Please provide a valid restaurant id").nullable().optional().or(z.literal("")),
		restaurant_ids: z
			.union([
				z.string().ulid("Please provide restaurant id"),
				z.string().ulid("Please provide restaurant ids").array(),
			])
			.nullable()
			.optional()
			.or(z.literal("")),
		status: z
			.union(
				[
					z.literal("active"),
					z.literal("suspended"),
					z.literal("unassigned"),
					z.literal("deleted"),
				],
				"Please provide a valid status",
			)
			.nullable()
			.optional()
			.or(z.literal("")),
		group_by: z.enum(["restaurants", "boxes"]).optional(),
		group_by_restaurants_has_driver: z.coerce.number().optional(),
		with_permission_for_box_id: z.string().ulid("Please provide a valid box id").optional().or(z.literal("")),
		with_connected_boxes: z.union([z.string(), z.boolean(), z.number()]).optional().transform(v => v === "true" || v === true || v === "1" || v === 1),
		with_employees_for_access_mode: z.enum(["public", "all_employees", "restaurant_employees"]).optional(),
		group_by_selected_table: z.string().optional(),
	}).refine((data) => {
		const hasRole = !!data.role;
		const hasRoles = !!data["roles[]"] && (Array.isArray(data["roles[]"]) ? data["roles[]"].length > 0 : true);
		if (hasRole && hasRoles) return false;
		return true;
	}, {
		message: "Please provide either 'role' or 'roles[]', not both",
		path: ["roles[]"],
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

export const suspendEmployeesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid employees").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reactivateEmployeesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid employees").array().min(1, "Please provide at least one id"),
		reassign_back_to_restaurants: z.boolean({
			error: "Please provide reassign_back_to_restaurants flag",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const deleteEmployeesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid employees").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
