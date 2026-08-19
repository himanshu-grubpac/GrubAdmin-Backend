import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
	NOTIFICATIONS_STATUS,
	NOTIFICATIONS_TYPE,
} from "@/configs/constants.ts";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { SEARCH_PAGE_SIZE } from "@/validators/pagination";
import { resolveAdminNotificationPagination } from "@/modules/admin/configs/admin-notification-limits.ts";

const adminNotificationPageSizeSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(SEARCH_PAGE_SIZE, `Limit cannot exceed ${SEARCH_PAGE_SIZE}`);

export const getAdminNotificationsRequestQueryValidators = zValidator(
	"query",
	z
		.object({
			query: z
				.string({
					error: "Please provide a query",
				})
				.trim()
				.optional(),
			type: z
				.union([
					z.union(NOTIFICATIONS_TYPE.map((n) => z.literal(n))).array(),
					z.union(NOTIFICATIONS_TYPE.map((n) => z.literal(n))),
				])
				.optional(),
			status: z
				.union([
					z.union(NOTIFICATIONS_STATUS.map((n) => z.literal(n))).array(),
					z.union(NOTIFICATIONS_STATUS.map((n) => z.literal(n))),
				])
				.optional(),
			minified: z.coerce.boolean().optional().default(false),
			page: z.coerce.number().int().min(1).optional(),
			limit: adminNotificationPageSizeSchema.optional(),
		})
		.transform((data) => {
			const type = data.type
				? Array.isArray(data.type)
					? data.type
					: [data.type]
				: undefined;
			const status = data.status
				? Array.isArray(data.status)
					? data.status
					: [data.status]
				: undefined;
			const { page, limit } = resolveAdminNotificationPagination({
				minified: data.minified,
				page: data.page,
				limit: data.limit,
			});

			return {
				query: data.query,
				type,
				status,
				minified: data.minified,
				page,
				limit,
			};
		}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const readNotificationsRequestBodyValidators = zValidator(
	"json",
	z.object({
		ids: z
			.string({
				error: "Please provide an id",
			})
			.array(),
	}),
);
