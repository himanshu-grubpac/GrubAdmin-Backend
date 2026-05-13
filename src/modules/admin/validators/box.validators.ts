import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { BOX_VERTICALS, PAGE_SIZE } from "@/configs/constants.ts";

export const createBoxRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_id: z
			.string({
				error: "Please provide a box id",
			})
			.trim()
			.min(1, "Box id is required"),
		name: z
			.string({
				error: "Please provide a name",
			})
			.trim()
			.min(1, "Name is required")
			.max(30, "Name must not be greater than 20 characters")
			.optional(),
		vertical: z.ulid({
			error: "Please provide a valid vertical id",
		}),
		vehicle_number: z.string().optional().nullable(),
		status: z.union([z.literal("active")], {
			error: "Please provide a valid status",
		}),
		power_status: z.string().optional().nullable(),
		health_status: z.string().optional().nullable(),
		ioniser_status: z.string().optional().nullable(),
		battery_percentage: z.coerce.number().optional().nullable(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateBoxRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_id: z
			.string({
				error: "Please provide a box id",
			})
			.trim()
			.min(1, "Box id is required")
			.optional(),
		name: z
			.string({
				error: "Please provide a name",
			})
			.trim()
			.min(1, "Name is required")
			.max(30, "Name must not be greater than 20 characters")
			.optional()
			.nullable(),
		vehicle_number: z.string().optional().nullable(),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.optional(),
		power_status: z.string().optional().nullable(),
		health_status: z.string().optional().nullable(),
		ioniser_status: z.string().optional().nullable(),
		battery_percentage: z.coerce.number().optional().nullable(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateBoxRequestParamValidator = zValidator(
	"param",
	z.object({
		id: z.ulid("Please provide a box id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const removeBoxesAssignmentRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_ids: z.ulid("Please provide a valid id").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const assignBoxesRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_ids: z.ulid("Please provide a valid id").array(),
		customer: z.ulid("Please provide a valid id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const deleteBoxesRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_ids: z.ulid("Please provide a valid id").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getBoxesRequestQueryValidator = zValidator(
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
		state: z
			.union(
				[z.literal("assigned"), z.literal("unassigned")],
				"Please provide a valid state",
			)
			.optional(),
		verticals: z
			.union([
				z.ulid("Please provide a valid id"),
				z.ulid("Please provide a valid ids").array(),
			])
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
