import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import {
	DELIVERY_LOG_DEFAULT_PAGE_SIZE,
	DELIVERY_LOG_EXPORT_MAX_ROWS,
} from "delivery/configs/delivery-log-limits.ts";

const deliveryLogLimitSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(DELIVERY_LOG_EXPORT_MAX_ROWS, `Limit cannot exceed ${DELIVERY_LOG_EXPORT_MAX_ROWS}`);

export const categoriesEnum = ["Restaurant", "Employee", "GrubPac", "Profile", "GrubLock"] as const;
export const typesEnum = [
	"Creation", "Deletion", "Suspension", "Activation", "Updation",
	"Reassignment", "Assignment", "Connection status", "Status",
	"Emergency unlock", "Ownership", "Access",
	"GrubLock", "Alerts", "Employee mgmt.", "Box mgmt.", "Restaurant mgmt.",
	"Box status", "Door status", "Temperature set", "Temp. self check",
	"Ioniser status", "Battery status", "Battery self check", "OTP"
] as const;

export const categoryToTypes: Record<typeof categoriesEnum[number], typeof typesEnum[number][]> = {
	Restaurant: ["Creation", "Deletion", "Suspension", "Activation", "Updation", "Assignment", "Reassignment"],
	Employee: ["Creation", "Deletion", "Suspension", "Activation", "Updation", "Reassignment", "Assignment", "Connection status", "GrubLock", "Alerts", "Employee mgmt.", "Box mgmt.", "Restaurant mgmt."],
	GrubPac: ["Creation", "Deletion", "Suspension", "Activation", "Updation", "Reassignment", "Assignment", "Ownership", "Box status", "Connection status", "Door status", "GrubLock", "Temperature set", "Temp. self check", "Ioniser status", "Battery status", "Battery self check", "Emergency unlock", "OTP"],
	GrubLock: ["Status", "Emergency unlock", "Updation", "OTP"],
	Profile: ["Updation", "Connection status", "Access", "Creation", "Suspension", "Activation", "Reassignment", "Assignment"],
};

export const filterStructure = {
	Restaurant: {
		system_logs: ["Creation", "Deletion", "Suspension", "Activation", "Updation"],
		action_logs: ["Assignment", "Reassignment"]
	},
	Employee: {
		system_logs: ["Creation", "Deletion", "Suspension", "Activation", "Updation"],
		action_logs: ["Reassignment", "Assignment", "Connection status", "GrubLock", "Alerts", "Employee mgmt.", "Box mgmt.", "Restaurant mgmt."]
	},
	GrubPac: {
		system_logs: ["Creation", "Deletion", "Suspension", "Activation", "Updation", "Box status", "Connection status", "Door status"],
		action_logs: ["Reassignment", "Assignment", "Ownership", "GrubLock", "Temperature set", "Temp. self check", "Ioniser status", "Battery status", "Battery self check", "Emergency unlock", "OTP"]
	},
	GrubLock: {
		system_logs: ["Status", "Updation"],
		action_logs: ["Emergency unlock", "OTP"]
	},
	Profile: {
		system_logs: ["Updation", "Access", "Creation"],
		action_logs: ["Connection status", "Suspension", "Activation", "Reassignment", "Assignment"]
	}
};

export const getSystemLogsRequestQueryValidator = zValidator(
	"query",
	z.object({
		category: z.union([
			z.enum(categoriesEnum),
			z.array(z.enum(categoriesEnum)),
		]).optional(),
		type: z.union([
			z.enum(typesEnum),
			z.array(z.enum(typesEnum)),
		]).optional(),
		actor_id: z.string().optional(),
		subject_id: z.string().optional(),
		search: z.string().optional(),
		query: z.string().optional(),
		start_date: z.string().optional().transform((v) => v ? new Date(v) : undefined),
		end_date: z.string().optional().transform((v) => {
			if (!v) return undefined;
			const date = new Date(v);
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
				date.setUTCHours(23, 59, 59, 999);
			}
			return date;
		}),
		page: z.coerce.number().int().min(1).optional(),
		limit: deliveryLogLimitSchema.optional(),
	}).transform((data) => ({
		...data,
		search: data.search ?? data.query,
		page: data.page ?? 1,
		limit: data.limit ?? DELIVERY_LOG_DEFAULT_PAGE_SIZE,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const searchSystemLogsRequestBodyValidator = zValidator(
	"json",
	z.object({
		filters: z.array(z.object({
			category: z.enum(categoriesEnum),
			types: z.array(z.enum(typesEnum)).optional(),
			other_types: z.array(z.string()).optional(),
		})).optional(),
		actor_id: z.string().optional(),
		subject_id: z.string().optional(),
		search: z.string().optional(),
		query: z.string().optional(),
		start_date: z.string().optional().transform((v) => v ? new Date(v) : undefined),
		end_date: z.string().optional().transform((v) => {
			if (!v) return undefined;
			const date = new Date(v);
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
				date.setUTCHours(23, 59, 59, 999);
			}
			return date;
		}),
		page: z.coerce.number().int().min(1).optional(),
		limit: deliveryLogLimitSchema.optional(),
	}).transform((data) => ({
		...data,
		search: data.search ?? data.query,
		page: data.page ?? 1,
		limit: data.limit ?? DELIVERY_LOG_DEFAULT_PAGE_SIZE,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
