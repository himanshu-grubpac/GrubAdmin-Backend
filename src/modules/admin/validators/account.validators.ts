import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const updateAccountRequestBodyValidator = zValidator(
	"json",
	z.object({
		first_name: z
			.string({
				error: "Please provide a first name",
			})
			.trim()
			.min(1, "First name must not be empty")
			.max(25, "First name must not be more than 25 characters")
			.optional(),
		last_name: z
			.string({
				error: "Please provide a last name",
			})
			.trim()
			.min(1, "Last name must not be empty")
			.max(25, "Last name must not be more than 25 characters")
			.optional(),
		new_password: z
			.string({
				error: "Please provide a new password",
			})
			.trim()
			.min(8, "Password must be at least 8 characters long")
			.max(20, "Password must not be more than 20 characters")
			.optional(),
		old_password: z
			.string({
				error: "Please provide an old password",
			})
			.trim()
			.min(8, "Old password must be at least 8 characters long")
			.max(20, "Old password must not be more than 20 characters")
			.optional(),
		assigned_location: z
			.string({
				error: "Please provide an assigned location",
			})
			.trim()
			.min(1, "Assigned must not be empty")
			.optional(),
		joining_date: z.coerce
			.date("Please provide a date of joining date")
			.optional(),
		email: z
			.email({
				error: "Please provide an email",
			})
			.optional(),
		mobile_number: z
			.string({
				error: "Please provide a valid mobile number",
			})
			.trim()
			.min(10, {
				error: "Mobile number must be 10 characters long",
			})
			.max(10, {
				error: "Mobile number must be 10 characters long",
			})
			.optional(),
		country_code: z
			.string({
				error: "Please provide a valid country code",
			})
			.trim()
			.min(1, {
				error: "Please provide a non empty country code",
			})
			.optional(),
	}).strict(),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const confirmUpdateAccountRequestBodyValidator = zValidator(
	"json",
	z.object({
		otp: z
			.string({
				error: "Please provide a valid otp",
			})
			.trim()
			.min(4, "Otp must be 4 characters long")
			.max(4, "Otp must be 4 characters long"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
