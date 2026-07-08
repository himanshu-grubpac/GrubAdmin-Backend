import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const updateAccountRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z.string().trim().min(1).optional(),
		email: z.string().trim().email().optional(),
		mobile_number: z.string().trim().optional(),
		country_code: z.string().trim().optional(),
		current_password: z.string().trim().min(8).optional(),
		new_password: z.string().trim().min(8).max(20).optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const confirmUpdateOtpRequestBodyValidator = zValidator(
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

export const updatePreferencesRequestBodyValidator = zValidator(
	"json",
	z.object({
		box_id: z.string().min(1, { error: "box_id is required" }).optional(),
		camera_alerts: z.boolean().optional(),
		battery_alerts: z.boolean().optional(),
		lock_alerts: z.boolean().optional(),
		display_alerts: z.boolean().optional(),
		other_alerts: z.boolean().optional(),
		theme: z.enum(["light", "dark"]).optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
