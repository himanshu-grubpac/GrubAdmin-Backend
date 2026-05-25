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
			.min(1, "Name is required")
			.max(100, "Name cannot exceed 100 characters"),
		state: z
			.string({
				error: "Please provide a state",
			})
			.trim()
			.min(1, "State is required")
			.max(100, "State cannot exceed 100 characters"),
		city: z
			.string({
				error: "Please provide a city",
			})
			.trim()
			.min(1, "City is required")
			.max(100, "City cannot exceed 100 characters"),
		pincode: z
			.string({
				error: "Please provide a pincode",
			})
			.trim()
			.min(1, "Pincode is required")
			.max(20, "Pincode cannot exceed 20 characters"),
		line_one: z
			.string({
				error: "Please provide a line one",
			})
			.trim()
			.min(1, "Line one is required")
			.max(200, "Line one cannot exceed 200 characters"),
		line_two: z
			.string({
				error: "Please provide a line two",
			})
			.trim()
			.min(1, "Line two is required")
			.max(200, "Line two cannot exceed 200 characters")
			.optional(),
		google_place_id: z
			.string({
				error: "Please provide a google place id",
			})
			.trim()
			.nullable()
			.optional()
			.or(z.literal("")),
		latitude: z.coerce.number().optional().nullable(),
		longitude: z.coerce.number().optional().nullable(),
		lattitude: z.coerce.number().optional().nullable(),
		longtitude: z.coerce.number().optional().nullable(),
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
		query: z.string().trim().min(2, "Query must be at least 2 characters").optional(),
		search: z.string().trim().min(2, "Search must be at least 2 characters").optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).max(100, "Page size cannot exceed 100").optional(),
		limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").optional(),
		status: z
			.union([z.literal("active"), z.literal("suspended")], {
				error: "Please provide a valid status",
			})
			.nullable()
			.optional()
			.or(z.literal("")),
		group_by: z.enum(["boxes"]).optional(),
		manager: z.coerce.boolean("Please provide a boolean value").optional(),
		driver: z.coerce.boolean("Please provide a boolean value").optional(),
		delivery: z.coerce.boolean("Please provide a boolean value").optional(),
		box: z.coerce.boolean("Please provide a boolean value").optional(),
		exclude_restaurant_ids: z.preprocess((val) => {
			if (typeof val === "string") return val.split(",");
			return val;
		}, z.array(z.string()).optional()),
		group_by_selected_table: z.string().optional(),
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

export const searchRestaurantRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().min(2, "Query must be at least 2 characters").optional(),
		search: z.string().trim().min(2, "Search must be at least 2 characters").optional(),
		limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").optional(),
		status: z.string().optional().default("all"),
	}).transform((data) => ({
		...data,
		limit: data.limit ?? undefined,
		query: data.query ?? data.search,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
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
		id: z.ulid("Please provide a valid restaurant id"),
		name: z
			.string({ error: "Please provide a name" })
			.trim()
			.min(1, "Name is required")
			.optional(),
		state: z
			.string({ error: "Please provide a state" })
			.trim()
			.min(1, "State is required")
			.optional(),
		city: z
			.string({ error: "Please provide a city" })
			.trim()
			.min(1, "City is required")
			.optional(),
		pincode: z
			.string({ error: "Please provide a pincode" })
			.trim()
			.min(1, "Pincode is required")
			.optional(),
		line_one: z
			.string({ error: "Please provide a line one" })
			.trim()
			.min(1, "Line one is required")
			.optional(),
		line_two: z
			.string({ error: "Please provide a line two" })
			.trim()
			.min(1, "Line two is required")
			.optional(),
		google_place_id: z
			.string({ error: "Please provide a google place id" })
			.trim()
			.nullable()
			.optional()
			.or(z.literal("")),
		latitude: z.coerce.number().optional().nullable(),
		longitude: z.coerce.number().optional().nullable(),
		lattitude: z.coerce.number().optional().nullable(),
		longtitude: z.coerce.number().optional().nullable(),
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



export const suspendRestaurantResourcesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.ulid("Please provide a valid id").array().min(1, "Please provide at least one restaurant id"),
		resource_status: z.enum(["suspend", "assign"]).default("suspend"),
		destination_restaurant_id: z.string().ulid().nullable().optional().or(z.literal("")),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const reassignRestaurantRequestBodyValidator = zValidator(
	"json",
	z.object({
		restaurant_ids: z.ulid("Please provide a valid source restaurant id").array().min(1, "Please provide at least one restaurant id"),
		destination_restaurant_id: z.string().ulid().nullable().optional().or(z.literal("")),
		reassign_employees: z.boolean().default(true),
		reassign_boxes: z.boolean().default(true),
	}).refine(
		(data) => {
			if (
				data.destination_restaurant_id &&
				data.restaurant_ids.includes(data.destination_restaurant_id)
			) {
				return false;
			}
			return true;
		},
		{
			message: "Destination restaurant cannot be one of the source restaurants to reassign",
			path: ["destination_restaurant_id"],
		}
	),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
export const assignEmployeesRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.ulid("Please provide a valid restaurant id"),
		employee_ids: z.ulid("Please provide a valid employee id").array().min(1, "Please provide at least one employee id"),
		role: z.enum(["manager", "driver"], {
			error: "Please provide a valid role (manager or driver)",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
