import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const loginRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email({
			error: "Please provide a valid email address",
		}),
		password: z
			.string({
				error: "Please provide a valid password",
			})
			.trim()
			.min(8, "Password must be at least 8 characters long!")
			.max(20, "Password must be at most 20 characters long!"),
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
		otp_id: z.string().optional(),
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
		otp_id: z.string().optional(),
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
		otp_id: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const setNewPasswordRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			email: z.string().trim().email({
				error: "Please provide a valid email",
			}),
			full_name: z.string().trim().min(1, {
				error: "Please provide your full name",
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
			confirm_password: z
				.string({
					error: "Please provide a confirm password",
				})
				.trim()
				.min(8, {
					error: "Password must be at least 8 characters long",
				})
				.max(20, {
					error: "Password can be at max 20 characters long",
				}),
		})
		.refine((data) => data.password === data.confirm_password, {
			message: "Passwords do not match",
			path: ["confirm_password"],
		}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const forgetPasswordSendOtpValidator = zValidator(
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

export const forgetPasswordVerifyOtpValidator = zValidator(
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

export const forgetPasswordSetPasswordValidator = zValidator(
	"json",
	z
		.object({
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
			confirm_password: z
				.string({
					error: "Please provide a confirm password",
				})
				.trim()
				.min(8, {
					error: "Password must be at least 8 characters long",
				})
				.max(20, {
					error: "Password can be at max 20 characters long",
				}),
		})
		.refine((data) => data.password === data.confirm_password, {
			message: "Passwords do not match",
			path: ["confirm_password"],
		}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
