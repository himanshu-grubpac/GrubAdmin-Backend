import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";

export const loginRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email({
			error: "Please provide a valid email",
		}),
		password: z
			.string({
				error: "Please provide a password",
			})
			.trim()
			.min(8, {
				error: "Password must be at least 8 characters long",
			})
			.max(20, {
				error: "Password can be at max 20 characters long",
			}),
		remember_me: z.boolean().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const sendOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email({
			error: "Please provide a valid email",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const verifyOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email({
			error: "Please provide a valid email",
		}),
		otp: z
			.string({
				error: "Please provide an otp",
			})
			.trim()
			.min(4, {
				error: "Otp must be 4 characters long!",
			})
			.max(4, {
				error: "Otp must be 4 characters long!",
			}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const resendOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email({
			error: "Please provide a valid email",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const sendPasswordResetOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email("Please provide an email"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const resendPasswordResetOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email("Please provide an email"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const confirmResetPasswordRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email("Please provide an email"),
		otp: z
			.string({
				error: "Please provide an otp",
			})
			.trim()
			.min(4, {
				error: "Otp must be 4 characters long!",
			})
			.max(4, {
				error: "Otp must be 4 characters long!",
			}),
		password: z
			.string({
				error: "Please provide a password",
			})
			.trim()
			.min(8, {
				error: "Password must be at least 8 characters long",
			})
			.max(20, {
				error: "Password can be at max 20 characters long",
			}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
