import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const getSupportCategoriesRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		id: z.ulid("Please provide a valid id").optional(),
		page: z.coerce.number().int().min(1).optional(),
		limit: z.coerce.number().int().min(1).optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).optional(),
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

export const getSupportQuestionsRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		term: z.string().trim().optional(),
		category_id: z.string({
			error: "Please provide a valid category_id",
		}).optional(),
		page: z.coerce.number().int().min(1).optional(),
		limit: z.coerce.number().int().min(1).optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).optional(),
	}).transform((data) => ({
		...data,
		page: data.page ?? data.page_number ?? 1,
		limit: data.limit ?? data.page_size ?? undefined,
		query: data.query ?? data.search ?? data.term,
	})),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const searchSupportQuestionsRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		limit: z.coerce.number().int().min(1).optional(),
		category_id: z.string({
			error: "Please provide a valid category_id",
		}).optional(),
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

export const getSupportAnswerRequestQueryValidator = zValidator(
	"query",
	z.object({
		faq_id: z.ulid("Please provide a valid faq_id"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const downloadSupportAttachmentRequestQueryValidator = zValidator(
	"query",
	z.object({
		path: z.string({
			error: "Please provide a valid path",
		}).min(1, "Please provide a valid path"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
