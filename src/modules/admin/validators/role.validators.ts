import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PAGE_SIZE, PERMISSION_TOPICS } from "@/configs/constants.ts";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createRoleRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a valid role name",
			})
			.trim()
			.min(1, "Role Name is required"),
		permissions: z.record(
			z.union(
				Object.values(PERMISSION_TOPICS).map((pt) => z.literal(pt)),
				"Permission topic must be a valid topic",
			),
			z.any(),
			"Permissions are required",
		),
		is_super_admin: z
			.boolean({
				error: "Please mention is the admin is super admin",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateRoleRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a valid role name",
			})
			.trim()
			.min(1, "Role Name is required")
			.optional(),
		permissions: z
			.record(
				z.union(
					Object.values(PERMISSION_TOPICS).map((pt) => z.literal(pt)),
					"Permission topic must be a valid topic",
				),
				z.any(),
				"Permissions are required",
			)
			.optional(),
		is_super_admin: z
			.boolean({
				error: "Please mention is the admin is super admin",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateRoleRequestParamValidator = zValidator(
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

export const deleteRoleRequestParamValidator = zValidator(
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

export const getRolesRequestQueryValidator = zValidator(
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
		hide_assigned: z.coerce
			.boolean("Hide assigned must be true or false")
			.default(false),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
