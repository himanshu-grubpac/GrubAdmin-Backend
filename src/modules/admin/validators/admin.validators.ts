import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { PAGE_SIZE } from "@/configs/constants.ts";

export const createAdminRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email("Please enter valid email address"),
		first_name: z
			.string({
				error: "Please provide a valid first name",
			})
			.trim()
			.min(2, "Name must be at least 2 characters long"),
<<<<<<< HEAD
		last_name: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string({
					error: "Please provide a valid last name",
				})
				.trim()
				.min(2, "Name must be at least 2 characters long")
				.nullable()
				.optional(),
		),
		country_code: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string()
				.trim()
				.min(1, "The country code must be 1 character long")
				.nullable()
				.optional(),
		),
		mobile_number: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string()
				.trim()
				.min(10, "Mobile number must be 10 characters long")
				.max(10, "Mobile number must be 10 characters long")
				.nullable()
				.optional(),
		),
		location: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string()
				.trim()
				.min(1, "Location must not be empty")
				.nullable()
				.optional(),
		),
		joining_date: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z.coerce
				.date("Please provide a valid joining date")
				.refine((date) => date <= new Date(), {
					message: "Joining date cannot be in the future",
				})
				.nullable()
				.optional(),
		),
		role: z.ulid("Please provide a valid role").optional(),
		employee_id: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z.string().nullable().optional(),
		),
=======
		last_name: z
			.string({
				error: "Please provide a valid last name",
			})
			.trim()
			.min(2, "Name must be at least 2 characters long")
			.optional(),
		country_code: z
			.string("Please provide a country code")
			.trim()
			.min(1, "The country code must be 1 character long")
			.optional(),
		mobile_number: z
			.string("Please provide a valid mobile number")
			.trim()
			.min(10, "Mobile number must be 10 characters long")
			.max(10, "Mobile number must be 10 characters long")
			.optional(),
		location: z
			.string("Please provide a valid location")
			.trim()
			.min(1, "Location must not be empty")
			.optional(),
		joining_date: z.coerce
			.date("Please provide a valid joining date")
			.optional(),
		role: z
			.string("Please provide a valid role")
			.min(1, "Please provide a valid role")
			.optional(),
		role_id: z
			.string("Please provide a valid role")
			.min(1, "Please provide a valid role")
			.optional(),
		employee_id: z.string("Please provide employee_id").optional(),
>>>>>>> 10646df5d526096b1ec09316196087e5cc7c2a0c
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateAdminRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid id"),
		email: z.string().trim().email("Please enter valid email address").optional(),
		first_name: z
			.string({
				error: "Please provide a valid first name",
			})
			.trim()
			.min(2, "Name must be at least 2 characters long")
			.optional(),
<<<<<<< HEAD
		last_name: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string({
					error: "Please provide a valid last name",
				})
				.trim()
				.min(2, "Name must be at least 2 characters long")
				.nullable()
				.optional(),
		),
		country_code: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string()
				.trim()
				.min(1, "The country code must be 1 character long")
				.nullable()
				.optional(),
		),
		mobile_number: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string()
				.trim()
				.min(10, "Mobile number must be 10 characters long")
				.max(10, "Mobile number must be 10 characters long")
				.nullable()
				.optional(),
		),
		location: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z
				.string()
				.trim()
				.min(1, "Location must not be empty")
				.nullable()
				.optional(),
		),
		joining_date: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z.coerce
				.date("Please provide a valid joining date")
				.refine((date) => date <= new Date(), {
					message: "Joining date cannot be in the future",
				})
				.nullable()
				.optional(),
		),
		role: z.ulid("Please provide a valid role").optional(),
		employee_id: z.preprocess(
			(val) => (val === "" || val === null ? null : val),
			z.string().nullable().optional(),
		),
=======
		last_name: z
			.string({
				error: "Please provide a valid last name",
			})
			.trim()
			.min(2, "Name must be at least 2 characters long")
			.optional(),
		country_code: z
			.string("Please provide a country code")
			.trim()
			.min(1, "The country code must be 1 character long")
			.optional(),
		mobile_number: z
			.string("Please provide a valid mobile number")
			.trim()
			.min(10, "Mobile number must be 10 characters long")
			.max(10, "Mobile number must be 10 characters long")
			.optional(),
		location: z
			.string("Please provide a valid location")
			.trim()
			.min(1, "Location must not be empty")
			.optional(),
		joining_date: z.coerce
			.date("Please provide a valid joining date")
			.optional(),
		role: z
			.string("Please provide a valid role")
			.min(1, "Please provide a valid role")
			.optional(),
		role_id: z
			.string("Please provide a valid role")
			.min(1, "Please provide a valid role")
			.optional(),
		employee_id: z.string("Please provide employee_id").optional(),
>>>>>>> 10646df5d526096b1ec09316196087e5cc7c2a0c
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getAdminsRequestQueryValidator = zValidator(
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
			.union([
				z.ulid("Please provide a valid role"),
				z.ulid("Please provide a valid role").array(),
			])
			.optional(),
		status: z
			.union(
				[
					z.literal("active"),
					z.literal("unassigned"),
					z.literal("suspended"),
					z.literal("dismissed"),
					z.literal("all"),
				],
				"Please provide a valid status",
			)
			.default("active"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const assignBulkRoleRequestBodyValidator = zValidator(
	"json",
	z.object({
		role: z.ulid("Please provide a valid role"),
		admins: z.ulid("Please provide valid admins").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const suspendAdminsRequestBodyValidator = zValidator(
	"json",
	z.object({
		admins: z.ulid("Please provide a valid admins").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reactivateAdminsRequestBodyValidator = zValidator(
	"json",
	z.object({
		admins: z.ulid("Please provide a valid admins").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const deleteAdminsRequestBodyValidator = zValidator(
	"json",
	z.object({
		admins: z.ulid("Please provide a valid admins").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const exportAdminsRequestQueryValidator = zValidator(
	"query",
	z.object({
		fetch_all: z.coerce
			.boolean({
				error: "Please provide a boolean value",
			})
			.optional(),
		include_roles: z.coerce
			.boolean({
				error: "Please provide a valid role flag",
			})
			.optional(),
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
			.union([
				z.ulid("Please provide a valid role"),
				z.ulid("Please provide a valid role").array(),
			])
			.optional(),
		status: z
			.union(
				[
					z.literal("active"),
					z.literal("unassigned"),
					z.literal("suspended"),
					z.literal("dismissed"),
					z.literal("all"),
				],
				"Please provide a valid status",
			)
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
