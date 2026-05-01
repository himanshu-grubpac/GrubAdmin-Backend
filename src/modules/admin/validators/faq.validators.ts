import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PAGE_SIZE } from "@/configs/constants.ts";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const createFaqQuestionsRequestBodyValidators = zValidator(
	"form",
	z.object({
		question: z.string({
			error: "Please provide a question",
		}),
		answer: z.string({
			error: "Please provide an answer",
		}),
		categories: z
			.string({
				error: "Please provide an categories",
			})
			.optional(),
		publishing_status: z
			.union([z.literal("published"), z.literal("draft")], {
				error: "Please provide a valid publishing status",
			})
			.default("draft"),
		files: z
			.union([
				z.file({
					error: "Please provide valid files",
				}),
				z
					.file({
						error: "Please provide valid files",
					})
					.array(),
			])
			.default([]),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateFaqQuestionsRequestParamsValidators = zValidator(
	"param",
	z.object({
		id: z.ulid("Please provide a valid "),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateFaqQuestionsRequestBodyValidators = zValidator(
	"form",
	z.object({
		question: z
			.string({
				error: "Please provide a question",
			})
			.optional(),
		answer: z
			.string({
				error: "Please provide an answer",
			})
			.optional(),
		categories: z
			.string({
				error: "Please provide categories",
			})
			.optional(),
		publishing_status: z
			.union([z.literal("published"), z.literal("draft")], {
				error: "Please provide a valid publishing status",
			})
			.default("draft")
			.optional(),
		files: z
			.union([
				z.file({
					error: "Please provide valid files",
				}),
				z
					.file({
						error: "Please provide valid files",
					})
					.array(),
			])
			.default([]),
		file_keys_deleted: z
			.string({
				error: "Please provide file keys to be deleted",
			})
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getFaqsRequestQueryValidators = zValidator(
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
		publishing_status: z
			.union(
				[z.literal("published"), z.literal("draft"), z.literal("all")],
				{
					error: "Please provide a valid publishing status",
				},
			)
			.default("all"),
		state: z
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
		category_id: z.ulid("Please provide a valid category_id").optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const exportFaqsRequestQueryValidators = zValidator(
	"query",
	z.object({
		publishing_status: z
			.union(
				[z.literal("published"), z.literal("draft"), z.literal("all")],
				{
					error: "Please provide a valid publishing status",
				},
			)
			.default("all"),
		category_id: z.ulid("Please provide a valid category_id").optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateFaqsPublishingStatusRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide valid ids").array(),
		publishing_status: z.union(
			[z.literal("published"), z.literal("draft")],
			{
				error: "Please provide a valid publishing status",
			},
		),
	}),
);

export const deleteFaqsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide valid ids").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const suspendFaqQuestionsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid ids").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const recoverFaqQuestionsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid ids").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const changeBulkFaqCategoryRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid ids").array(),
		old_category: z.ulid("Please provide a valid category_id"),
		new_category: z.ulid("Please provide a valid category_id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateFaqRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid id"),
		question: z.string({
			error: "Please provide a question",
		}),
		answer: z.string({
			error: "Please provide an answer",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

