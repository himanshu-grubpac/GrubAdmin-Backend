import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { pageLimitFields } from "@/validators/pagination";

export const getNotificationsRequestQueryValidator = zValidator(
	"query",
	z.object({
		...pageLimitFields,
		types: z.union([
			z.enum(["warning", "error", "success", "notification"]),
			z.array(z.enum(["warning", "error", "success", "notification"])),
		]).optional(),
		floor_ids: z.union([
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
	}).transform((data) => ({
		...data,
		page: data.page ?? 1,
		types: data.types ? (Array.isArray(data.types) ? data.types : [data.types]) : undefined,
		floor_ids: data.floor_ids
			? Array.isArray(data.floor_ids)
				? data.floor_ids
				: [data.floor_ids]
			: undefined,
		box_ids: data.box_ids
			? Array.isArray(data.box_ids)
				? data.box_ids
				: [data.box_ids]
			: undefined,
	})),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const markNotificationsRequestBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().ulid("Please provide valid notification ids")).optional(),
		is_read: z.boolean().optional(),
		is_dismissed: z.boolean().optional(),
	}).refine((d) => d.is_read !== undefined || d.is_dismissed !== undefined, {
		message: "Provide at least one of is_read or is_dismissed",
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
