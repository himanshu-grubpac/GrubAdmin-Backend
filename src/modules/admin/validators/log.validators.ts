import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { LOG_ACTIONS, LOG_MODULES, PAGE_SIZE } from "@/configs/constants.ts";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const getAdminLogsRequestQueryValidators = zValidator(
	"query",
	z.object({
		query: z.string().trim().optional(),
		search: z.string().trim().optional(),
		page_number: z.coerce.number().int().min(1).default(1),
		page_size: z.coerce.number().int().min(1).default(PAGE_SIZE),
		page: z.coerce.number().int().min(1).optional(),
		limit: z.coerce.number().int().min(1).optional(),
		category: z.union([
			z.enum(["Restaurant", "Employee", "GrubPac", "GrubLock", "Profile"]),
			z.array(z.enum(["Restaurant", "Employee", "GrubPac", "GrubLock", "Profile"])),
		]).optional(),
		type: z.union([
			z.enum(["Creation", "Deletion", "Suspension", "Activation", "Updation", "Reassignment", "Connection", "Status", "Emergency", "Ownership", "Access"]),
			z.array(z.enum(["Creation", "Deletion", "Suspension", "Activation", "Updation", "Reassignment", "Connection", "Status", "Emergency", "Ownership", "Access"])),
		]).optional(),
		modules: z
			.union([
				z.union(LOG_MODULES.map((m) => z.literal(m))),
				z.union(LOG_MODULES.map((m) => z.literal(m))).array(),
			])
			.optional(),
		employee: z
			.union([
				z.union(LOG_ACTIONS.map((m) => z.literal(m))),
				z.union(LOG_ACTIONS.map((m) => z.literal(m))).array(),
			])
			.optional(),
		roles: z
			.union([
				z.union(LOG_ACTIONS.map((m) => z.literal(m))),
				z.union(LOG_ACTIONS.map((m) => z.literal(m))).array(),
			])
			.optional(),
		client: z
			.union([
				z.union(LOG_ACTIONS.map((m) => z.literal(m))),
				z.union(LOG_ACTIONS.map((m) => z.literal(m))).array(),
			])
			.optional(),
		support_categories: z
			.union([
				z.union(LOG_ACTIONS.map((m) => z.literal(m))),
				z.union(LOG_ACTIONS.map((m) => z.literal(m))).array(),
			])
			.optional(),
		faq: z
			.union([
				z.union(LOG_ACTIONS.map((m) => z.literal(m))),
				z.union(LOG_ACTIONS.map((m) => z.literal(m))).array(),
			])
			.optional(),
		grubpac: z
			.union([
				z.union(LOG_ACTIONS.map((m) => z.literal(m))),
				z.union(LOG_ACTIONS.map((m) => z.literal(m))).array(),
			])
			.optional(),
		admin_id: z.string().optional(),
		subject_id: z.string().optional(),
		client_id: z.string().optional(),
		filters: z.string().optional(),
		start_date: z.string().optional().transform((v) => v ? new Date(v) : undefined),
		end_date: z.string().optional().transform((v) => {
			if (!v) return undefined;
			const date = new Date(v);
			if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
				date.setUTCHours(23, 59, 59, 999);
			}
			return date;
		}),
	}).transform((data) => ({
		...data,
		page: data.page ?? data.page_number,
		limit: data.limit ?? data.page_size,
		category: data.category ?? data.modules,
		search: data.search ?? data.query,
	})),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
