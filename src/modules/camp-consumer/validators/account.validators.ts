import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const deleteAccountRequestBodyValidator = zValidator(
	"json",
	z.object({
		password: z.string().trim().min(8).max(20).optional(),
	}),
	(response) => {
		if (!response.success) validatorErrorHandler(response.error);
	},
);

export const updateAccountRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			full_name: z.string().trim().min(1, "Full name is required").optional(),
			email: z.string().trim().email("Please provide a valid email address").optional(),
			phone: z.string().trim().optional(),
			country_code: z.string().trim().optional(),
		})
		.refine((data) => Object.values(data).some((v) => v !== undefined), {
			message: "At least one profile field is required",
		}),
	(response) => {
		if (!response.success) validatorErrorHandler(response.error);
	},
);

export const updatePasswordRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			current_password: z
				.string()
				.trim()
				.min(8, "Current password must be at least 8 characters long")
				.max(20, "Current password must be at most 20 characters long"),
			new_password: z
				.string()
				.trim()
				.min(8, "New password must be at least 8 characters long")
				.max(20, "New password must be at most 20 characters long"),
			confirm_password: z
				.string()
				.trim()
				.min(8, "Confirm password must be at least 8 characters long")
				.max(20, "Confirm password must be at most 20 characters long"),
		})
		.refine((data) => data.new_password === data.confirm_password, {
			message: "Passwords do not match",
			path: ["confirm_password"],
		}),
	(response) => {
		if (!response.success) validatorErrorHandler(response.error);
	},
);
