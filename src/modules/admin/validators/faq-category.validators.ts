import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { PAGE_SIZE } from "@/configs/constants.ts";

export const createFaqCategoryRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a valid name",
			})
			.trim()
			.min(1, "Name is required"),
		icon: z.ulid("Please provide a valid icon"),
		vertical: z.ulid("Please provide a valid vertical"),
		description: z
			.string({
				error: "Please provide a valid description",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getFaqCategoryRequestQueryValidator = zValidator(
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
		category_state: z
			.union(
				[
					z.literal("active"),
					z.literal("suspended"),
					z.literal("deleted"),
				],
				{
					error: "Please provide a valid category_state i.e., active, suspended or deleted",
				},
			)
			.default("active"),
		include_questions: z.coerce.boolean().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reorderCategoriesRequestBodyValidator = zValidator(
	"json",
	z.object({
		order: z.record(z.string(), z.number()),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const exportFaqCategoryRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z
			.string({
				error: "Please provide a query",
			})
			.trim()
			.optional(),
		category_state: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid category_state i.e., active or suspended",
			})
			.default("active"),
		include_questions: z.coerce.boolean().optional(),
		vertical_id: z.ulid("Please provide a valid vertical id").optional(),
		fetch_all: z.coerce
			.boolean({
				error: "Please provide a boolean value",
			})
			.optional(),
		question_status: z
			.union([z.literal("published"), z.literal("draft")], {
				error: "Please provide a valid question state i.e., published or suspended",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const suspendFaqCategoriesRequestBodyValidator = zValidator(
	"json",
	z.object({
		categories: z.string("Please provide valid categories").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reactivateFaqCategoriesRequestBodyValidator = zValidator(
	"json",
	z.object({
		categories: z.string("Please provide valid categories").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateFaqCategoryRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid id"),
		name: z
			.string({
				error: "Please provide a valid name",
			})
			.trim()
			.min(1, "Name is required")
			.optional(),
		icon: z.ulid("Please provide a valid icon").optional(),
		vertical: z.ulid("Please provide a valid vertical").optional(),
		description: z
			.string({
				error: "Please provide a valid description",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const deleteFaqCategoriesRequestBodyValidator = zValidator(
	"json",
	z.object({
		categories: z.string("Please provide a valid id").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
