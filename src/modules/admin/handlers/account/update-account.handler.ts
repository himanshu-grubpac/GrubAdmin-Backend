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

		if ((joining_date || assigned_location) && type !== "admin") {
			throw new APIError(undefined, "admin.auth.UNAUTHORIZED", undefined, 403);
		}

		if (
			email &&
			(mobile_number ||
				new_password ||
				old_password ||
				first_name ||
				last_name ||
				joining_date ||
				assigned_location ||
				country_code)
		) {
			throw new APIError(undefined, "admin.account.UPDATE_RESTRICTION", undefined, 400);
		}

		if (
			mobile_number &&
			(email ||
				new_password ||
				old_password ||
				first_name ||
				last_name ||
				joining_date ||
				assigned_location)
		) {
			throw new APIError(undefined, "admin.account.UPDATE_RESTRICTION", undefined, 400);
		}

		if (
			new_password &&
			(email ||
				first_name ||
				last_name ||
				joining_date ||
				assigned_location ||
				mobile_number ||
				country_code)
		) {
			throw new APIError(undefined, "admin.account.UPDATE_RESTRICTION", undefined, 400);
		}

		if (email) {
			if (user.email === email) {
				throw new APIError(undefined, "admin.account.SAME_OLD_VALUE", undefined, 400);
			}

			const profileUpdateOtp = await getAdminUpdateOtp(user_id);

			if (profileUpdateOtp && profileUpdateOtp.email) {
				throw new APIError(undefined, "admin.account.OTP_ALREADY_SENT", undefined, 400);
			}

			const otp = Otp.generateOtp(4);

			await upsertAdminUpdateOtp({
				email,
				user_id,
				otp,
			});

			await services.mailer.sendEmail({
				from: MAIL,
				subject: "OTP for Account Update",
				to: email,
				text: `Your account update OTP is ${otp}`,
			});

			const response = {
				success: true as const,
				...resolveMessageTemplate("admin.account.UPDATE_OTP_SENT"),
			};

			return context.json(response as any, response.code as any);
		} else if (mobile_number) {
			if (
				user.mobile_number === mobile_number &&
				user.country_code === country_code
			) {
				throw new APIError(undefined, "admin.account.SAME_OLD_VALUE", undefined, 400);
			}

			if (!country_code) {
				throw new APIError("Please provide a country code", undefined, undefined, 400);
			}

			const profileUpdateOtp = await getAdminUpdateOtp(user_id);

			if (profileUpdateOtp && profileUpdateOtp.mobile_number) {
				throw new APIError(undefined, "admin.account.OTP_ALREADY_SENT", undefined, 400);
			}

			logger.warn("We are sending the OTP on email only");

			const otp = Otp.generateOtp(4);

			await upsertAdminUpdateOtp({
				mobile_number,
				country_code,
				user_id,
				otp,
			});

			await services.mailer.sendEmail({
				from: MAIL,
				subject: "OTP for Account Update",
				to: user.email,
				text: `Your account update OTP is ${otp}`,
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
