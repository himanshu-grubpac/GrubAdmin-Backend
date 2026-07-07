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
