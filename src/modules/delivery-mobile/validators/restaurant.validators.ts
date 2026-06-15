import { PAGE_SIZE } from "@/configs/constants";
import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

export const createRestaurantRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a name",
			})
			.trim()
			.min(1, "Name is required"),
		state: z
			.string({
				error: "Please provide a state",
			})
			.trim()
			.min(1, "State is required"),
		city: z
			.string({
				error: "Please provide a city",
			})
			.trim()
			.min(1, "City is required"),
		pincode: z
			.string({
				error: "Please provide a pincode",
			})
			.trim()
			.min(1, "Pincode is required"),
		line_one: z
			.string({
				error: "Please provide a line one",
			})
			.trim()
			.min(1, "Line one is required"),
		line_two: z
			.string({
				error: "Please provide a line two",
			})
			.trim()
			.min(1, "Line two is required")
			.optional(),
		google_place_id: z
			.string({
				error: "Please provide a google place id",
			})
			.trim()
			.min(1, "Google place id is required"),
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

export const getRestaurantByIdRequestParamsValidator = zValidator(
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

export const getRestaurantsRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string("Please provide a query").trim().optional(),
		page_number: z.coerce
			.number("Please provide a page number")
			.int("Page number must be an integer")
			.nonnegative("Page number cannot be negative")
			.default(1),
		page_size: z.coerce
			.number("Please provide a page size")
			.int("Page size must be an integer")
			.nonnegative("Page size cannot be negative")
			.default(PAGE_SIZE),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.default("active"),
		manager: z.coerce.boolean("Please provide a boolean value").optional(),
		driver: z.coerce.boolean("Please provide a boolean value").optional(),
		box: z.coerce.boolean("Please provide a boolean value").optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const editRestaurantRequestParamsValidator = zValidator(
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

export const editRestaurantRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z
			.string({
				error: "Please provide a name",
			})
			.trim()
			.min(1, "Name is required")
			.optional(),
		state: z
			.string({
				error: "Please provide a state",
			})
			.trim()
			.min(1, "State is required")
			.optional(),
		city: z
			.string({
				error: "Please provide a city",
			})
			.trim()
			.min(1, "City is required")
			.optional(),
		pincode: z
			.string({
				error: "Please provide a pincode",
			})
			.trim()
			.min(1, "Pincode is required")
			.optional(),
		line_one: z
			.string({
				error: "Please provide a line one",
			})
			.trim()
			.min(1, "Line one is required")
			.optional(),
		line_two: z
			.string({
				error: "Please provide a line two",
			})
			.trim()
			.min(1, "Line two is required")
			.optional(),
		google_place_id: z
			.string({
				error: "Please provide a google place id",
			})
			.trim()
			.min(1, "Google place id is required")
			.optional(),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.default("active")
			.optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const unassignRestaurantResourcesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid id").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reassignRestaurantResourcesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid id").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const suspendRestaurantResourcesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid id").array(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
