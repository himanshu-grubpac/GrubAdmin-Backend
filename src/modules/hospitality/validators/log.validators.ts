import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { pageLimitFields } from "@/validators/pagination";

export const categoriesEnum = ["GrubPac", "Profile"] as const;
export const typesEnum = [
	"Creation", "Deletion", "Suspension", "Activation", "Updation",
	"Reassignment", "Assignment", "Connection status", "Status",
	"Ownership", "Access",
	"Box status", "Door status", "Temperature set", "Temp. self check",
	"Ioniser status", "Battery status", "Battery self check",
] as const;

export const categoryToTypes: Record<typeof categoriesEnum[number], typeof typesEnum[number][]> = {
	GrubPac: [
		"Creation", "Deletion", "Suspension", "Activation", "Updation",
		"Reassignment", "Assignment", "Ownership", "Box status", "Connection status",
		"Door status", "Temperature set", "Temp. self check", "Ioniser status",
		"Battery status", "Battery self check"
	],
	Profile: [
		"Updation", "Connection status", "Access", "Creation", "Suspension",
		"Activation", "Reassignment", "Assignment"
	],
};

export const filterStructure = {
	GrubPac: {
		system_logs: ["Creation", "Deletion", "Suspension", "Activation", "Updation", "Box status", "Connection status", "Door status"],
		action_logs: ["Reassignment", "Assignment", "Ownership", "Temperature set", "Temp. self check", "Ioniser status", "Battery status", "Battery self check"]
	},
	Profile: {
		system_logs: ["Updation", "Access", "Creation"],
		action_logs: ["Connection status", "Suspension", "Activation", "Reassignment", "Assignment"]
	}
};

export const settingsChangedAuditRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			batch_id: z.string().min(1).optional(),
			box_ids: z
				.array(z.string().ulid("Please provide valid box ids"))
				.min(1, "Please provide at least one box id")
				.max(100, "Please provide at most 100 box ids")
				.optional(),
			since: z.string().datetime().optional(),
		})
		.refine((data) => Boolean(data.batch_id || (data.box_ids && data.box_ids.length > 0)), {
			message: "Provide batch_id or box_ids",
		}),
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
		...pageLimitFields,
	}).transform((data) => ({
		...data,
		search: data.search ?? data.query,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
