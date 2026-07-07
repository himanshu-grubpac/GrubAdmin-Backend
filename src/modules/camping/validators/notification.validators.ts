import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const getNotificationsQueryValidator = zValidator(
	"query",
	z.object({
		box_id: z.string().optional(),
		category: z.enum(["camera", "battery", "lock", "display", "other"]).optional(),
		type: z.enum(["warning", "error", "success", "notification"]).optional(),
		page: z.coerce.number().int().min(1).optional().default(1),
		page_size: z.coerce.number().int().min(1).max(100).optional().default(40),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const markNotificationsRequestBodyValidator = zValidator(
	"json",
	z.object({
		notification_ids: z.array(z.string()).min(1, {
			error: "Please provide at least one notification ID",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
