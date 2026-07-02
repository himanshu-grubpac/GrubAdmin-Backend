import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

export const createFloorRequestBodyValidator = zValidator(
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

export const updateFloorRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.string().ulid("Please provide a valid floor id"),
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

export const getFloorDetailsQueryValidator = zValidator(
	"query",
	z.object({
		id: z.string().ulid("Please provide a valid id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const deleteFloorsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z
			.string()
			.ulid("Please provide a valid floor id")
			.array()
			.min(1, "Please provide at least one floor id"),
		destination_floor_id: z.string().ulid().nullable().optional().or(z.literal("")),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const suspendFloorsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z
			.string()
			.ulid("Please provide a valid floor id")
			.array()
			.min(1, "Please provide at least one floor id"),
		resource_status: z.enum(["suspend", "assign"]).default("suspend"),
		destination_floor_id: z.string().ulid().nullable().optional().or(z.literal("")),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reactivateFloorsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z
			.string()
			.ulid("Please provide a valid floor id")
			.array()
			.min(1, "Please provide at least one floor id"),
		reactivate_boxes: z.boolean().default(false),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getFloorsRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().min(1, "Query is required").optional(),
		search: z.string().trim().min(1, "Search is required").optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).max(100, "Page size cannot exceed 100").optional(),
		limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").optional(),
		status: z
			.union([z.literal("active"), z.literal("suspended"), z.literal("all")], {
				error: "Please provide a valid status",
			})
			.nullable()
			.optional()
			.or(z.literal("")),
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

export const searchFloorsRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().min(1, "Query is required").optional(),
		search: z.string().trim().min(1, "Search is required").optional(),
		limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").optional(),
		status: z.string().optional().default("all"),
	}).transform((data) => ({
		...data,
		limit: data.limit ?? undefined,
		query: data.query ?? data.search,
	})),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
