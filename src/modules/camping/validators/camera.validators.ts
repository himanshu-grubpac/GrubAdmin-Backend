import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const getCameraFeedQueryValidator = zValidator(
	"query",
	z.object({
		camera: z.coerce.number().int().min(1).max(4).optional(),
		date: z.string().optional(),
		page: z.coerce.number().int().min(1).optional().default(1),
		page_size: z.coerce.number().int().min(1).max(100).optional().default(40),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getFeedDetailQueryValidator = zValidator(
	"query",
	z.object({
		camera: z.coerce.number().int().min(1).max(4).optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const downloadFeedRequestBodyValidator = zValidator(
	"json",
	z.object({
		camera: z.coerce.number().int().min(1).max(4).optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const playbackFeedRequestBodyValidator = zValidator(
	"json",
	z.object({
		camera: z.coerce.number().int().min(1).max(4).optional(),
		start_time: z.string().optional(),
		end_time: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
