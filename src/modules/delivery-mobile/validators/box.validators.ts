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
		.refine(
			(data) => Object.values(data).some((value) => value !== undefined),
			{ message: "At least one setting field is required" },
		),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

const lockActionSchema = z.enum(["unlock", "lock"]);

export const lockOtpBodyValidator = zValidator(
	"json",
	z.object({
		action: lockActionSchema,
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const verifyLockOtpBodyValidator = zValidator(
	"json",
	z.object({
		code: z.string().length(4, "OTP must be 4 digits"),
		action: lockActionSchema,
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);
