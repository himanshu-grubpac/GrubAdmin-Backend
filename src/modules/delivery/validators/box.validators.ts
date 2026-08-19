import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { PAGE_SIZE } from "@/configs/constants.ts";
import { SEARCH_PAGE_SIZE } from "@/validators/pagination";

const deliveryListPageSizeSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(SEARCH_PAGE_SIZE, `Page size cannot exceed ${SEARCH_PAGE_SIZE}`);

const deliverySearchLimitSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(SEARCH_PAGE_SIZE, `Limit cannot exceed ${SEARCH_PAGE_SIZE}`);

export const getBoxesRequestQueryValidator = zValidator(
	"query",
	z.object({
		status: z.enum(["active", "suspended"]).nullable().optional().or(z.literal("")),
		restaurant_id: z.string().ulid("Please provide a valid restaurant id").nullable().optional().or(z.literal("")),
		employee_id: z.string().ulid("Please provide a valid employee id").nullable().optional().or(z.literal("")),
		page_number: z.coerce.number().int().min(1).optional(),
		page: z.coerce.number().int().min(1).optional(),
		page_size: deliveryListPageSizeSchema.optional(),
		limit: deliveryListPageSizeSchema.optional(),
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		group_by: z.enum(["lock_status", "restaurants", "power_status"]).optional(),
		group_by_restaurants_has_offline_box: z.coerce.number().optional(),
		connection_status: z.string().optional(),
		power_status: z.string().optional(),
		health_status: z.preprocess(
			(val) => (typeof val === "string" && val.trim() !== "" ? val.trim().toLowerCase() : val),
			z.enum(["critical", "healthy", "attention"]).nullable().optional().or(z.literal("")),
		),
		grublock_status: z.string().optional(),
		restaurant_assigned: z.enum(["on", "off", "all"]).optional(),
		vehicle_assigned: z.enum(["on", "off", "all"]).optional(),
		ioniser_status: z.string().optional(),
		dual_zone_status: z.string().optional(),
		zone1_min: z.coerce.number().optional(),
		zone1_max: z.coerce.number().optional(),
		zone2_min: z.coerce.number().optional(),
		zone2_max: z.coerce.number().optional(),
		ext_min: z.coerce.number().optional(),
		ext_max: z.coerce.number().optional(),
		permission_status: z.enum(["shared", "blocked"]).optional(),
		group_by_selected_table: z.string().optional(),
	}).transform((data) => ({
		...data,
		page: data.page ?? data.page_number ?? 1,
		limit: data.limit ?? data.page_size ?? SEARCH_PAGE_SIZE,
		query: data.query ?? data.search,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const suspendBoxesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.string().ulid("Please provide valid box ids").array().min(1, "Please provide at least one box id"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const reactivateBoxesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.string().ulid("Please provide valid box ids").array().min(1, "Please provide at least one box id"),
		reassign: z.boolean().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const deleteBoxesRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.string().ulid("Please provide valid box ids").array().min(1, "Please provide at least one box id"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const reassignBoxesRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_ids: z.string().ulid("Please provide valid box ids").array().optional(),
		ids: z.string().ulid("Please provide valid box ids").array().optional(),
		destination_restaurant_id: z.union([
			z.string().ulid("Please provide a valid restaurant id"),
			z.literal(""),
			z.null(),
		]).optional(),
		restaurant_id: z.union([
			z.string().ulid("Please provide a valid restaurant id"),
			z.literal(""),
			z.null(),
		]).optional(),
	}).refine((data) => {
		const targetIds = data.box_ids || data.ids;
		return !!(targetIds && targetIds.length > 0);
	}, {
		message: "Please provide at least one box id",
		path: ["box_ids"],
	}).transform((data) => ({
		box_ids: data.box_ids || data.ids || [],
		destination_restaurant_id: data.destination_restaurant_id ?? data.restaurant_id ?? null,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const createGrubpacRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z.string().max(100, "Name cannot exceed 100 characters").optional(),
		box_id: z.string().min(1, "Box ID is required").max(50, "Box ID cannot exceed 50 characters"),
		vehicle_number: z.string().max(50, "Vehicle number cannot exceed 50 characters").optional().nullable(),
		restaurant_ids: z.array(z.string().ulid()).optional().default([]),
		blocked_employee_ids: z.array(z.string().ulid()).optional().default([]),
		access_mode: z.enum(["public", "all_employees", "restaurant_employees"], {
			error: "Please provide a valid access mode (public, all_employees, or restaurant_employees)",
		}),
	}).strict(),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const updateGrubpacRequestBodyValidator = zValidator(
	"json",
	z.object({
		id: z.string().ulid("Please provide a valid box id"),
		name: z.string().max(100, "Name cannot exceed 100 characters").optional(),
		box_id: z.string().max(50, "Box ID cannot exceed 50 characters").optional(),
		vehicle_number: z.string().max(50, "Vehicle number cannot exceed 50 characters").optional().nullable(),
		restaurant_ids: z.array(z.string().ulid()).optional(),
		blocked_employee_ids: z.array(z.string().ulid()).optional(),
		access_mode: z.enum(["public", "all_employees", "restaurant_employees"]).optional(),
		ext_temp: z.coerce.number().optional(),
	}).strict(),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const actionGrubpacRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().ulid()).min(1, "Please provide at least one box id"),
		status: z.enum(["active", "suspended"]).optional(),
		power_status: z.string().optional(),
		ioniser_status: z.string().optional(),
		dual_zone_status: z.string().optional(),
		zone1_temp: z.coerce.number().optional(),
		zone2_temp: z.coerce.number().optional(),
		ext_temp: z.coerce.number().optional(),
		assign_restaurant_id: z.string().ulid().optional().nullable(),
		vehicle_number: z.string().optional().nullable(),
		adas_status: z.string().optional(),
		bluetooth_status: z.string().optional(),
		camera_status: z.string().optional(),
		gps_status: z.string().optional(),
		gyrosensor_status: z.string().optional(),
		save_to_memory_status: z.string().optional(),
		sim_status: z.string().optional(),
		solar_status: z.string().optional(),
		wifi_status: z.string().optional(),
		turn_signal_status: z.string().optional(),
		advert_screen_status: z.string().optional(),
		port_small_status: z.string().optional(),
		port_big_status: z.string().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const searchBoxesRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		limit: deliverySearchLimitSchema.optional(),
		status: z.enum(["active", "suspended"]).optional(),
	}).transform((data) => ({
		...data,
		limit: data.limit ?? SEARCH_PAGE_SIZE,
		query: data.query ?? data.search,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const getGrubpacDetailsRequestQueryValidator = zValidator(
	"query",
	z.object({
		id: z.string().ulid("Please provide a valid box id"),
		with_permission_for_employee_id: z.string().ulid("Please provide a valid employee id").optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const getGrublockRequestQueryValidator = zValidator(
	"query",
	z.object({
		status: z.enum(["active", "suspended"]).nullable().optional().or(z.literal("")),
		restaurant_id: z.string().ulid("Please provide a valid restaurant id").nullable().optional().or(z.literal("")),
		employee_id: z.string().ulid("Please provide a valid employee id").nullable().optional().or(z.literal("")),
		group_by: z.enum(["lock_status", "restaurants", "power_status"]).optional(),
		group_by_restaurants_has_offline_box: z.coerce.number().optional(),
		connection_status: z.string().optional(),
		power_status: z.string().optional(),
		health_status: z.preprocess(
			(val) => (typeof val === "string" && val.trim() !== "" ? val.trim().toLowerCase() : val),
			z.enum(["critical", "healthy", "attention"]).nullable().optional().or(z.literal("")),
		),
		grublock_status: z.string().optional(),
		restaurant_assigned: z.enum(["on", "off", "all"]).optional(),
		vehicle_assigned: z.enum(["on", "off", "all"]).optional(),
		ioniser_status: z.string().optional(),
		dual_zone_status: z.string().optional(),
		zone1_min: z.coerce.number().optional(),
		zone1_max: z.coerce.number().optional(),
		zone2_min: z.coerce.number().optional(),
		zone2_max: z.coerce.number().optional(),
		ext_min: z.coerce.number().optional(),
		ext_max: z.coerce.number().optional(),
		page_number: z.coerce.number().int().min(1).optional(),
		page: z.coerce.number().int().min(1).optional(),
		page_size: z.coerce.number().int().min(1).optional(),
		limit: z.coerce.number().int().min(1).optional(),
		group_by_selected_table: z.string().optional(),
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
	}).transform((data) => ({
		...data,
		page: data.page ?? data.page_number ?? 1,
		limit: data.limit ?? data.page_size ?? PAGE_SIZE,
		query: data.query ?? data.search,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const searchGrublockRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		limit: deliverySearchLimitSchema.optional(),
		status: z.enum(["active", "suspended"]).optional(),
	}).transform((data) => ({
		...data,
		limit: data.limit ?? SEARCH_PAGE_SIZE,
		query: data.query ?? data.search,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const emergencyUnlockGrublockRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().ulid()).min(1, "Please provide at least one box id"),
		reason: z.string().min(1, "Please provide a reason for emergency unlock"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const lockUnlockGrublockRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().ulid()).min(1, "Please provide at least one box id"),
		consumer_full_name: z.string().optional(),
		consumer_country_code: z.string().optional(),
		consumer_phone: z.string().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const unlockGrublockRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().ulid()).min(1, "Please provide at least one box id"),
		consumer_full_name: z.string().optional(),
		consumer_country_code: z.string().optional(),
		consumer_phone: z.string().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const verifyUnlockGrublockRequestBodyValidator = zValidator(
	"json",
	z.object({
		otp_id: z.string().min(1, "OTP ID is required"),
		otp: z.string().min(4, "OTP must be at least 4 digits"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const reassignBoxEmployeeRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_ids: z.array(z.string().ulid("Please provide valid box ids")).min(1, "Please provide at least one box id"),
		employee_ids: z.array(z.string().ulid("Please provide valid employee ids")).min(1, "Please provide at least one employee id"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
