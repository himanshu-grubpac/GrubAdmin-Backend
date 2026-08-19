import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

/** Hospitality FE (SetNewPassword / forgot / reset): 8–20 chars, no spaces. No special-char mandate. */
const hospitalityPasswordSchema = z
	.string({
		error: "Please provide a password",
	})
	.trim()
	.min(8, {
		error: "Password must be at least 8 characters long",
	})
	.max(20, {
		error: "Password cannot exceed 20 characters",
	})
	.refine((value) => !/\s/.test(value), {
		message: "Spaces are not allowed in the password",
	});

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
			.min(1, "Password is required")
			.max(72, "Password must be at most 72 characters long!"),
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

export const sendForgetPasswordMagicLinkRequestBodyValidator = zValidator(
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

export const resetPasswordMagicLinkRequestBodyValidator = zValidator(
	"json",
	z.object({
		email: z.string().trim().email({
			error: "Please provide a valid email",
		}),
		token: z
			.string({
				error: "Please provide a reset token",
			})
			.min(1, {
				error: "Invalid reset token",
			}),
		password: hospitalityPasswordSchema,
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const verifyForgetPasswordMagicLinkRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			link_id: z.string().trim().min(1).optional(),
			email: z.string().trim().email().optional(),
			token: z
				.string({
					error: "Please provide a reset token",
				})
				.min(1, {
					error: "Invalid reset token",
				})
				.optional(),
		})
		.refine(
			(data) =>
				Boolean(data.link_id) ||
				(Boolean(data.email) && Boolean(data.token)),
			{
				message: "Provide link_id or email with token",
			},
		),
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
			auth_token: z.string().optional(),
			otp_id: z.string().optional(),
			password: hospitalityPasswordSchema,
			confirm_password: hospitalityPasswordSchema,
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
