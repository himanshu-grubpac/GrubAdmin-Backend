import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { updateAccountRequestBodyValidator } from "@/modules/admin/validators/account.validators.ts";
import {
	getUniqueAdmin,
	setNewPassword,
	updateAdmin,
} from "@/db/actions/admin.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { Bcrypt } from "@/utils/bcrypt.ts";
import {
	getAdminUpdateOtp,
	upsertAdminUpdateOtp,
} from "@/db/actions/admin-update-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import { logger } from "@/utils/logger.ts";
import { resolveMessageTemplate } from "@/utils/message.ts";
import { MAIL } from "@/configs/env.ts";

export const updateAccountHandler = createHandlers(
	authGuard(["admin", "employee"]),
	updateAccountRequestBodyValidator,
	async (context) => {
		const { user_id } = context.var;

		const {
			email,
			new_password,
			mobile_number,
			old_password,
			first_name,
			last_name,
			assigned_location,
			joining_date,
			country_code,
		} = context.req.valid("json");

		const admin = await getUniqueAdmin({
			id: user_id,
		});

		if (!admin) {
			throw new APIError(undefined, "admin.auth.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		const { user, type } = admin;

		// [SENIOR ARCHITECTURE FIX]: Determine what has actually changed
		// This prevents "Restriction" errors when the frontend sends stale/current data.
		const isEmailChanged = !!(email && email !== user.email);
		const isMobileChanged = !!(mobile_number && mobile_number !== user.mobile_number);
		const isPasswordChanging = !!new_password;
		const isNameChanged = !!((first_name && first_name !== user.first_name) || (last_name && last_name !== user.last_name));
		const isLocationChanged = !!(assigned_location && assigned_location !== user.location);
		const isDateChanged = !!(joining_date && new Date(joining_date).toISOString() !== user.joining_date?.toISOString());

		if ((isDateChanged || isLocationChanged) && type !== "admin") {
			throw new APIError("You are not authorized to change the joining date or assigned location.", "admin.auth.UNAUTHORIZED", undefined, 403);
		}

		// Apply restrictions only to ACTUAL changes
		if (isEmailChanged && (isMobileChanged || isPasswordChanging || isNameChanged || isLocationChanged || isDateChanged)) {
			throw new APIError("You cannot update your email along with other profile or security details in a single request.", "admin.account.UPDATE_RESTRICTION", undefined, 400);
		}

		if (isMobileChanged && (isEmailChanged || isPasswordChanging || isNameChanged || isLocationChanged || isDateChanged)) {
			throw new APIError("You cannot update your mobile number along with other profile or security details in a single request.", "admin.account.UPDATE_RESTRICTION", undefined, 400);
		}

		if (isPasswordChanging && (isEmailChanged || isMobileChanged || isNameChanged || isLocationChanged || isDateChanged)) {
			throw new APIError("You cannot update your password along with other profile details in a single request.", "admin.account.UPDATE_RESTRICTION", undefined, 400);
		}

		if (isEmailChanged) {
			const profileUpdateOtp = await getAdminUpdateOtp(user_id);

			if (profileUpdateOtp && profileUpdateOtp.email) {
				const timeSinceLastOtp = Date.now() - Number(profileUpdateOtp.updatedAt);
				if (timeSinceLastOtp < 60 * 1000) {
					throw new APIError("An OTP has already been sent recently. Please wait a minute before requesting another.", "admin.account.OTP_ALREADY_SENT", undefined, 400);
				}
			}

			const otp = Otp.generateOtp(4);

			await upsertAdminUpdateOtp({
				email,
				user_id,
				otp,
			});

			services.mailer.sendEmail({
				from: MAIL,
				subject: "OTP for Account Update",
				to: email,
				text: `Your account update OTP is ${otp}`,
			}).catch(err => {
				logger.error("Failed to send profile update OTP email in background:", err);
			});

			const response = {
				success: true as const,
				...resolveMessageTemplate("admin.account.UPDATE_OTP_SENT"),
			};

			return context.json(response as any, response.code as any);
		} else if (isMobileChanged) {
			if (!country_code) {
				throw new APIError("Please provide a country code", undefined, undefined, 400);
			}

			const profileUpdateOtp = await getAdminUpdateOtp(user_id);

			if (profileUpdateOtp && profileUpdateOtp.mobile_number) {
				const timeSinceLastOtp = Date.now() - Number(profileUpdateOtp.updatedAt);
				if (timeSinceLastOtp < 60 * 1000) {
					throw new APIError("An OTP has already been sent recently. Please wait a minute before requesting another.", "admin.account.OTP_ALREADY_SENT", undefined, 400);
				}
			}

			logger.warn("We are sending the OTP on email only");

			const otp = Otp.generateOtp(4);

			await upsertAdminUpdateOtp({
				mobile_number,
				country_code,
				user_id,
				otp,
			});

			services.mailer.sendEmail({
				from: MAIL,
				subject: "OTP for Account Update",
				to: user.email,
				text: `Your account update OTP is ${otp}`,
			}).catch(err => {
				logger.error("Failed to send profile update OTP email in background:", err);
			});

			const response = {
				success: true as const,
				...resolveMessageTemplate("admin.account.UPDATE_OTP_SENT"),
			};

			return context.json(response as any, response.code as any);
		} else if (new_password) {
			if (!user.password) {
				await setNewPassword({
					new_password,
					id: user_id,
				});

				const response = {
					success: true as const,
					...resolveMessageTemplate("admin.account.UPDATE_SUCCESS"),
				};

				return context.json(response as any, response.code as any);
			}

			if (!old_password) {
				throw new APIError("Please provide the old password for verification purposes", undefined, undefined, 400);
			}

			const isOldPasswordCorrect = await Bcrypt.compareHash({
				data: old_password,
				hashedValue: user.password,
			});

			if (!isOldPasswordCorrect) {
				throw new APIError(undefined, "admin.account.INVALID_PASSWORD", undefined, 400);
			}


			await setNewPassword({
				new_password,
				id: user_id,
			});
		} else {
			if (last_name && !first_name) {
				throw new APIError("You cannot have a lastname without having a first name!", undefined, undefined, 400);
			}

			await updateAdmin({
				id: user_id,
				data: {
					first_name: first_name,
					last_name: last_name,
					joining_date,
					location: assigned_location,
				},
			});
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("admin.account.UPDATE_SUCCESS"),
		};

		return context.json(response as any, response.code as any);
	},
);
