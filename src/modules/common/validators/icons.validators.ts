import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { LONG_PAGE_SIZE } from "@/configs/constants.ts";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const getIconRequestQueryValidator = zValidator(
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
			.default(LONG_PAGE_SIZE),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
