import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { listPaginationFields, searchLimitField } from "@/validators/pagination";

export const getBoxesRequestQueryValidator = zValidator(
	"query",
	z.object({
		status: z.enum(["active", "suspended"]).nullable().optional().or(z.literal("")),
		...listPaginationFields,
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		group_by: z.enum(["lock_status", "power_status", "floors"]).optional(),
		connection_status: z.string().optional(),
		power_status: z.string().optional(),
		health_status: z.string().optional(),
		ioniser_status: z.string().optional(),
		dual_zone_status: z.string().optional(),
		zone1_min: z.coerce.number().optional(),
		zone1_max: z.coerce.number().optional(),
		zone2_min: z.coerce.number().optional(),
		zone2_max: z.coerce.number().optional(),
		ext_min: z.coerce.number().optional(),
		ext_max: z.coerce.number().optional(),
		group_by_selected_table: z.string().optional(),
	}).transform((data) => ({
		...data,
		page: data.page ?? data.page_number ?? 1,
		limit: data.limit ?? data.page_size ?? undefined,
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
		destination_floor_id: z.union([
			z.string().ulid("Please provide a valid floor id"),
			z.literal(""),
			z.null(),
		]).optional(),
		floor_id: z.union([
			z.string().ulid("Please provide a valid floor id"),
			z.literal(""),
			z.null(),
		]).optional(),
		room: z.string().optional().nullable(),
	}).refine((data) => {
		const targetIds = data.box_ids || data.ids;
		return !!(targetIds && targetIds.length > 0);
	}, {
		message: "Please provide at least one box id",
		path: ["box_ids"],
	}).transform((data) => ({
		box_ids: data.box_ids || data.ids || [],
		destination_floor_id: data.destination_floor_id ?? data.floor_id ?? null,
		room: data.room ?? null,
	})),
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
		assign_floor_id: z.string().ulid().optional().nullable(),
		room: z.string().optional().nullable(),
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
		...searchLimitField,
		status: z.enum(["active", "suspended"]).optional(),
	}).transform((data) => ({
		...data,
		limit: data.limit ?? 50,
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
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
