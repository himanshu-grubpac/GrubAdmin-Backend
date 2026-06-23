import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod.ts";

export const updateAccountRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			full_name: z
				.string({
					error: "Please provide a valid name",
				})
				.trim()
				.min(1, "Name must be at least 1 character long!")
				.max(100, "Name must be at most 100 characters long!")
				.optional(),
			organization_name: z
				.string({
					error: "Please provide a valid organization name",
				})
				.trim()
				.min(1, "Organization name must be at least 1 character long!")
				.max(100, "Organization name must be at most 100 characters long!")
				.optional(),
			email: z.string().trim().email({
				error: "Please provide a valid email",
			}).optional(),
			country_code: z
				.string({
					error: "Please provide a valid country code",
				})
				.trim()
				.optional(),
			phone: z
				.string({
					error: "Please provide a valid phone number",
				})
				.trim()
				.min(7, "Phone number must be at least 7 digits long!")
				.max(15, "Phone number must be at most 15 digits long!")
				.regex(/^\d+$/, "Phone number must contain only digits!")
				.optional(),
			old_password: z
				.string({
					error: "Please provide a valid old password",
				})
				.trim()
				.min(8, "Old password must be at least 8 characters long!")
				.max(72, "Old password can be at most 72 characters long!")
				.optional(),
			new_password: z
				.string({
					error: "Please provide a valid new password",
				})
				.trim()
				.min(8, "New password must be at least 8 characters long!")
				.max(72, "New password can be at most 72 characters long!")
				.regex(/[A-Z]/, "New password must contain at least one uppercase letter!")
				.regex(/[a-z]/, "New password must contain at least one lowercase letter!")
				.regex(/[0-9]/, "New password must contain at least one number!")
				.regex(/[^A-Za-z0-9]/, "New password must contain at least one special character!")
				.optional(),
			confirm_new_password: z
				.string({
					error: "Please provide a valid confirm password",
				})
				.trim()
				.min(8, "Confirm password must be at least 8 characters long!")
				.max(72, "Confirm password can be at most 72 characters long!")
				.optional(),
			otp_id: z.string().optional(),
		})
		.refine(
			(data) => {
				// if confirm_new_password is provided, new_password must also be provided
				if (data.confirm_new_password && !data.new_password) return false;
				return true;
			},
			{
				message: "New password is required when confirm password is provided.",
				path: ["new_password"],
			},
		)
		.refine(
			(data) => {
				// if old_password exists, new_password and confirm_new_password are required
				if (data.old_password && (!data.new_password || !data.confirm_new_password)) return false;
				return true;
			},
			{
				message: "New and confirmation passwords are required when updating with an old password.",
				path: ["new_password"],
			},
		)
		.refine(
			(data) => {
				if (data.new_password && data.new_password !== data.confirm_new_password) {
					return false;
				}
				return true;
			},
			{
				message: "Passwords do not match",
				path: ["confirm_new_password"],
			},
		),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const transferOwnershipRequestBodyValidator = zValidator(
	"json",
	z.object({
		transfer_mode: z.enum(["selected", "all"], {
			message: "Please provide a valid transfer mode (selected or all)",
		}),
		ids: z.array(z.string()).optional(),
		name: z.string().min(1, "Name is required"),
		organization_name: z.string().min(1, "Organization name is required"),
		country_code: z.string().min(1, "Country code is required"),
		phone: z.string().trim().min(1, "Phone is required"),
		email: z.string().trim().email("Invalid email"),
		country: z.string().min(1, "Country is required"),
		state: z.string().min(1, "State is required"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const verifyTransferOwnershipRequestBodyValidator = zValidator(
	"json",
	z.object({
		otp_id: z.string().min(1, "OTP ID is required"),
		otp: z.string().min(1, "OTP is required"),
	}),
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
		otp_id: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const resendUpdateAccountOtpRequestBodyValidator = zValidator(
	"json",
	z.object({
		otp_id: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getMyGrubpacsRequestQueryValidator = zValidator(
	"query",
	z.object({
		power_status: z.enum(["on", "off", "unknown"]).optional(),
		query: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const transferEntireAccountRequestBodyValidator = zValidator(
	"json",
	z.object({
		name: z.string().min(1, "Name is required"),
		organization_name: z.string().min(1, "Organization name is required"),
		country_code: z.string().min(1, "Country code is required"),
		phone: z.string().trim().min(1, "Phone is required"),
		email: z.string().trim().email("Invalid email"),
		country: z.string().min(1, "Country is required"),
		state: z.string().min(1, "State is required"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

