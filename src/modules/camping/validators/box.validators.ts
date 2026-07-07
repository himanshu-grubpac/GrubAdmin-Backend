import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const registerBoxRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_display_id: z.string().trim().min(1, {
			error: "Please provide the box display ID from the QR code",
		}),
		name: z.string().trim().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateBoxSettingsRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z.string().trim().optional(),
		zone1_target_temp: z.number().int().optional(),
		zone2_target_temp: z.number().int().optional(),
		zone1_status: z.enum(["on", "off"]).optional(),
		zone2_status: z.enum(["on", "off"]).optional(),
		ioniser_status: z.enum(["on", "off"]).optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const lockOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		action: z.enum(["lock", "unlock"]),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const lockVerifyRequestBodyValidator = zValidator(
	"json",
	z.object({
		otp: z
			.string()
			.trim()
			.min(4, { error: "Otp must be 4 characters long!" })
			.max(4, { error: "Otp must be 4 characters long!" }),
		otp_id: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const lockActionRequestBodyValidator = zValidator(
	"json",
	z.object({
		action: z.enum(["lock", "unlock"]),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
