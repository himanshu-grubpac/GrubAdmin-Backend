import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { PAGE_SIZE } from "@/configs/constants.ts";

export const createEmployeeRequestBodyValidator = zValidator(
	"json",
	z.object({
		first_name: z
			.string({
				error: "Please provide a first name",
			})
			.trim()
			.min(1, "Please provide a first name"),
		last_name: z
			.string({
				error: "Please provide a last name",
			})
			.trim()
			.min(1, "Please provide a last name"),
		email: z.string().trim().email("Please provide a valid email address"),
		country_code: z
			.string({
				error: "Please provide a valid country code",
			})
			.trim()
			.min(1, "Please provide a valid country code"),
		mobile_number: z
			.string({
				error: "Please provide a valid mobile number",
			})
			.trim()
			.min(10, "Please provide a valid mobile number")
			.max(10, "Please provide a valid mobile number"),
		joining_date: z.coerce.date("Please provide a valid joining date"),
		employee_id: z
			.string({
				error: "Please provide a valid employee id",
			})
			.trim()
			.min(1, "Employee id is required"),
		role: z.union(
			[z.literal("manager"), z.literal("delivery")],
			"Please provide a valid role",
		),
		restaurant_id: z.ulid("Please provide a valid restaurant id").nullable().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getEmployeesRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z
			.string({
				error: "Please provide a query",
			})
			.trim()
			.optional(),
		page_number: z.coerce
			.number("Please provide a page number")
			.int("Page number must an integer")
			.nonnegative("Page number cannot be negative")
			.default(1),
		page_size: z.coerce
			.number("Please provide a page size")
			.int("Page size must an integer")
			.nonnegative("Page size cannot be negative")
			.default(PAGE_SIZE),
		role: z
			.union(
				[
					z
						.union([z.literal("manager"), z.literal("delivery")])
						.array(),
					z.union([z.literal("manager"), z.literal("delivery")]),
				],
				"Please provide a valid role",
			)
			.optional(),
		restaurant_ids: z
			.union([
				z.ulid("Please provide restaurant id"),
				z.ulid("Please provide restaurant ids").array(),
			])
			.optional(),
		status: z
			.union([
				z.literal("active"),
				z.literal("unassigned"),
				z.literal("suspended"),
			])
			.optional(),
		// TODO: Box connection and restaurants filters to be added!
	}),
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
		ids: z.ulid("Please provide a valid employees").array(),
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
