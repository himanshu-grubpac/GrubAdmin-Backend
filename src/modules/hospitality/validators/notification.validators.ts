import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { pageLimitFields } from "@/validators/pagination";

const notificationTypeEnum = z.enum(["warning", "error", "success", "notification"]);

/** Match dropdown cap — enough for a partial filter, not a full-tenant dump on the wire. */
const FILTER_ID_ARRAY_MAX = 500;

const uniqueNonEmpty = (ids: string[] | undefined): string[] | undefined => {
	if (!ids?.length) return undefined;
	const unique = Array.from(new Set(ids));
	return unique.length > 0 ? unique : undefined;
};

const notificationListFilterTransform = <
	T extends {
		page?: number;
		types?: z.infer<typeof notificationTypeEnum> | z.infer<typeof notificationTypeEnum>[];
		floor_ids?: string | string[];
		box_ids?: string | string[];
		search?: string;
	},
>(
	data: T,
) => ({
	...data,
	page: data.page ?? 1,
	types: data.types ? (Array.isArray(data.types) ? data.types : [data.types]) : undefined,
	floor_ids: uniqueNonEmpty(
		data.floor_ids ? (Array.isArray(data.floor_ids) ? data.floor_ids : [data.floor_ids]) : undefined,
	),
	box_ids: uniqueNonEmpty(
		data.box_ids ? (Array.isArray(data.box_ids) ? data.box_ids : [data.box_ids]) : undefined,
	),
	search: data.search?.trim() || undefined,
});

export const getNotificationsRequestQueryValidator = zValidator(
	"query",
	z
		.object({
			...pageLimitFields,
			types: z.union([notificationTypeEnum, z.array(notificationTypeEnum).max(4)]).optional(),
			floor_ids: z
				.union([z.string().ulid(), z.array(z.string().ulid()).max(FILTER_ID_ARRAY_MAX)])
				.optional(),
			box_ids: z
				.union([z.string().ulid(), z.array(z.string().ulid()).max(FILTER_ID_ARRAY_MAX)])
				.optional(),
			search: z.string().max(200).optional(),
			is_read: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
			is_dismissed: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
		})
		.transform(notificationListFilterTransform),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

/** POST /notification/search — same filters as GET list, in JSON so large id arrays cannot 431. */
export const searchNotificationsRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			...pageLimitFields,
			types: z.array(notificationTypeEnum).max(4).optional(),
			floor_ids: z.array(z.string().ulid()).max(FILTER_ID_ARRAY_MAX).optional(),
			box_ids: z.array(z.string().ulid()).max(FILTER_ID_ARRAY_MAX).optional(),
			search: z.string().max(200).optional(),
			is_read: z.boolean().optional(),
			is_dismissed: z.boolean().optional(),
		})
		.transform(notificationListFilterTransform),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const markNotificationsRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			/** Required — never allow bulk-dismiss of the entire tenant without explicit ids. */
			ids: z
				.array(z.string().ulid("Please provide valid notification ids"))
				.min(1, "Provide at least one notification id")
				.max(100, "Mark at most 100 notifications per request"),
			is_read: z.boolean().optional(),
			is_dismissed: z.boolean().optional(),
		})
		.refine((d) => d.is_read !== undefined || d.is_dismissed !== undefined, {
			message: "Provide at least one of is_read or is_dismissed",
		}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
