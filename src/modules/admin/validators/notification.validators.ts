import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
	NOTIFICATIONS_STATUS,
	NOTIFICATIONS_TYPE,
} from "@/configs/constants.ts";

export const getAdminNotificationsRequestQueryValidators = zValidator(
	"query",
	z.object({
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
		minified: z.coerce.boolean(),
	}),
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
