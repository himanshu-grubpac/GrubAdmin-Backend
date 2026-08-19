import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { SEARCH_PAGE_SIZE } from "@/validators/pagination";

const deliveryNotificationPageSizeSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(SEARCH_PAGE_SIZE, `Limit cannot exceed ${SEARCH_PAGE_SIZE}`);

export const getNotificationsRequestQueryValidator = zValidator(
	"query",
	z.object({
		page: z.coerce.number().int().min(1).optional(),
		limit: deliveryNotificationPageSizeSchema.optional(),
		types: z.union([
			z.enum(["warning", "error", "success", "notification"]),
			z.array(z.enum(["warning", "error", "success", "notification"])),
		]).optional(),
		restaurant_ids: z.union([
			z.string().ulid(),
			z.array(z.string().ulid()),
		]).optional(),
		box_ids: z.union([
			z.string().ulid(),
			z.array(z.string().ulid()),
		]).optional(),
		search: z.string().optional(),
		is_read: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
		is_dismissed: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
		status: z.union([
			z.enum(["read", "unread"]),
			z.array(z.enum(["read", "unread"])),
		]).optional(),
	}).transform((data) => {
		let is_read = data.is_read;
		if (data.status) {
			const statuses = Array.isArray(data.status) ? data.status : [data.status];
			if (statuses.length === 1) {
				is_read = statuses[0] === "read";
			}
		}
		return {
			...data,
			is_read,
			page: data.page ?? 1,
			limit: data.limit ?? SEARCH_PAGE_SIZE,
			types: data.types ? (Array.isArray(data.types) ? data.types : [data.types]) : undefined,
			restaurant_ids: data.restaurant_ids ? (Array.isArray(data.restaurant_ids) ? data.restaurant_ids : [data.restaurant_ids]) : undefined,
			box_ids: data.box_ids ? (Array.isArray(data.box_ids) ? data.box_ids : [data.box_ids]) : undefined,
		};
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const markNotificationsRequestBodyValidator = zValidator(
	"json",
	z.object({
		/** Required — never allow bulk-dismiss of the entire tenant without explicit ids. */
		ids: z.array(z.string().ulid("Please provide valid notification ids")).min(1, "Provide at least one notification id"),
		is_read: z.boolean().optional(),
		is_dismissed: z.boolean().optional(),
	}).refine((d) => d.is_read !== undefined || d.is_dismissed !== undefined, {
		message: "Provide at least one of is_read or is_dismissed",
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
