import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

export const boxIdParamValidator = zValidator(
	"param",
	z.object({
		box_id: z.string().trim().min(1, "Box id (ULID) is required"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const claimBoxBodyValidator = zValidator(
	"json",
	z
		.object({
			display_id: z.string().trim().min(1).optional(),
			box_display_id: z.string().trim().min(1).optional(),
		})
		.refine((data) => !!(data.display_id || data.box_display_id), {
			message: "display_id or box_display_id is required",
		}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const updateBoxSettingsBodyValidator = zValidator(
	"json",
	z
		.object({
			is_dual_zone: z.boolean().optional(),
			zone_1_temp: z.number().optional(),
			zone_2_temp: z.number().optional(),
			ioniser_enabled: z.boolean().optional(),
		})
		.refine((data) => Object.values(data).some((value) => value !== undefined), {
			message: "At least one setting field is required",
		}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const lockGrublockBodyValidator = zValidator(
	"json",
	z.object({
		ids: z.array(z.string().trim().min(1)).min(1, "Please provide at least one box id"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const boxAlertsQueryValidator = zValidator(
	"query",
	z.object({
		severity: z.string().optional(),
		type: z.string().optional(),
		category: z.string().optional(),
		from: z.string().optional(),
		to: z.string().optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const shareLocationBodyValidator = zValidator(
	"json",
	z.object({
		ttl_minutes: z.number().int().min(1).max(1440).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
