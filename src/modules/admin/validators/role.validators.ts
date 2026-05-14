import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PAGE_SIZE, PERMISSION_TOPICS, PERMISSION_SETS } from "@/configs/constants.ts";
import { validatorErrorHandler } from "@/utils/zod.ts";

const permissionSchema = z
	.record(
		z.string(),
		z.array(z.string({ error: "Individual permissions must be text strings" }), {
			error: "Permissions under a topic must be an array of strings",
		}).min(1, "Permissions list under a topic cannot be empty"),
	)
	.superRefine((permissions, ctx) => {
		for (const [topic, values] of Object.entries(permissions)) {
			// @ts-ignore
			const allowedSet = PERMISSION_SETS[topic as keyof typeof PERMISSION_SETS];

			if (!allowedSet) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Permission topic must be a valid topic",
					path: [topic],
				});
				continue;
			}

			if (!values) continue;

			for (const value of values) {
				if (!allowedSet.has(value as never)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Invalid permission '${value}' under topic '${topic}'`,
						path: [topic],
					});
				}
			}
		}
	});

export const createRoleRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a valid role name",
			})
			.trim()
			.min(2, "Role name must be at least 2 characters long")
			.max(50, "Role name must not exceed 50 characters"),
		permissions: permissionSchema,
		is_super_admin: z.boolean().optional(),
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
			.min(2, "Role name must be at least 2 characters long")
			.max(50, "Role name must not exceed 50 characters")
			.optional(),
		permissions: permissionSchema.optional(),
		is_super_admin: z.boolean().optional(),
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
		id: z.string().min(1, "Please provide a valid id"),
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
		id: z.string().min(1, "Please provide a valid id"),
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
