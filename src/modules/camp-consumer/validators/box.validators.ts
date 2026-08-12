import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import {
	mobileLockOtpBodyValidator,
	mobileVerifyLockOtpBodyValidator,
} from "@/modules/mobile-core/grublock-validators";

export const boxIdParamValidator = zValidator(
	"param",
	z.object({
		box_id: z.string().trim().min(1, "Box id (ULID) is required"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const feedIdParamValidator = zValidator(
	"param",
	z.object({
		box_id: z.string().trim().min(1, "Box id (ULID) is required"),
		feed_id: z.string().trim().min(1, "Feed id is required"),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const registerBoxBodyValidator = zValidator(
	"json",
	z.object({
		scanned_code: z.string().trim().min(1, "Scanned code is required"),
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
			advert_display_enabled: z.boolean().optional(),
			ioniser_enabled: z.boolean().optional(),
			light_enabled: z.boolean().optional(),
		})
		.refine((data) => Object.values(data).some((value) => value !== undefined), {
			message: "At least one setting field is required",
		}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const surveillanceModeBodyValidator = zValidator(
	"json",
	z.object({
		enabled: z.boolean(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export { mobileLockOtpBodyValidator as lockOtpBodyValidator };
export { mobileVerifyLockOtpBodyValidator as verifyLockOtpBodyValidator };

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

export const cameraLiveQueryValidator = zValidator(
	"query",
	z.object({
		cam: z.coerce.number().int().min(1).max(4).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const cameraFeedsQueryValidator = zValidator(
	"query",
	z.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
			.optional(),
		cam: z.coerce.number().int().min(1).max(4).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const cameraUploadUrlBodyValidator = zValidator(
	"json",
	z.object({
		kind: z.enum(["live", "recording", "thumbnail"]),
		cam_id: z.number().int().min(1).max(4),
		feed_id: z.string().trim().min(1).optional(),
		filename: z.string().trim().min(1).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const cameraFeedRegisterBodyValidator = zValidator(
	"json",
	z.object({
		cam_id: z.number().int().min(1).max(4),
		s3_key: z.string().trim().min(1, "s3_key is required"),
		thumbnail_key: z.string().trim().min(1).optional(),
		recorded_at: z.string().trim().min(1, "recorded_at is required"),
		duration_sec: z.number().int().min(0).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

/** Figma PATCH alerts body — also accepts notification-style is_read/is_dismissed. */
export const patchBoxAlertsBodyValidator = zValidator(
	"json",
	z
		.object({
			ids: z.array(z.string().min(1)),
			read: z.boolean().optional(),
			dismissed: z.boolean().optional(),
			is_read: z.boolean().optional(),
			is_dismissed: z.boolean().optional(),
		})
		.transform((data) => ({
			ids: data.ids,
			read: data.read ?? data.is_read,
			dismissed: data.dismissed ?? data.is_dismissed,
		}))
		.refine((data) => data.read !== undefined || data.dismissed !== undefined, {
			message: "Either read or dismissed must be provided",
		}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
