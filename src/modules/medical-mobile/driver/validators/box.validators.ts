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

export const shareLocationBodyValidator = zValidator(
	"json",
	z.object({
		ttl_minutes: z.number().int().min(1).max(1440).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
