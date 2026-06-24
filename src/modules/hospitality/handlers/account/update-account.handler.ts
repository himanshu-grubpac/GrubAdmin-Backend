import { createHandlers } from "@/utils/hono-factory.ts";
import { updateAccountRequestBodyValidator } from "hospitality/validators/account.validators.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import {
	deleteDeliveryEmployeeUpdateOtp,
	getDeliveryEmployeeUpdateOtp,
	upsertVerticalDeliveryUpdateOtp,
} from "@/db/actions/delivery-employee-update-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import { getCookie, setCookie } from "hono/cookie";
import { resolveMessageTemplate } from "@/utils/message.ts";
import { prisma } from "@/db";

export const updateAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	updateAccountRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;
		const userObj = user as any;

		const {
			full_name,
			organization_name,
			email: newEmail,
			country_code: newCountryCode,
			phone: newPhone,
			old_password,
			new_password,
			otp_id: otp_id_body,
		} = context.req.valid("json");

		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		let hashedPassword: string | undefined;
		let isPasswordActuallyChanged = false;

		if (new_password || old_password) {
			const hasExistingPassword = !!userObj.password;

			if (hasExistingPassword) {
				if (!old_password) {
					throw new APIError(undefined, "hospitality.account.PASSWORD_REQUIRED", undefined, 400);
				}

				const isOldPasswordCorrect = await Bcrypt.compareHash({
					data: old_password,
					hashedValue: userObj.password as string,
				});

				if (!isOldPasswordCorrect) {
					throw new APIError(undefined, "hospitality.auth.login.PASSWORD_INVALID", undefined, 400);
				}

				if (new_password && new_password === old_password) {
					throw new APIError(undefined, "hospitality.account.SAME_PASSWORD", undefined, 400);
				}
			} else {
				if (!new_password) {
					throw new APIError(undefined, "hospitality.account.PASSWORD_REQUIRED", undefined, 400);
				}
			}

			if (new_password) {
				isPasswordActuallyChanged = true;
				hashedPassword = await Bcrypt.generateHash({ data: new_password });
			}
		}

		const isEmailChanged = !!(newEmail && newEmail !== userObj.email);
		const isPhoneChanged = !!(
			newPhone &&
			(newPhone !== userObj.mobile_number ||
				(newCountryCode && newCountryCode !== userObj.country_code))
		);

		const isNameChanged = !!(
			full_name !== undefined && full_name.trim() !== userObj.name
		);

		const isOrgChanged = !!(
			organization_name !== undefined &&
			organization_name !== userObj.organization_name
		);

		const has_changed =
			isEmailChanged ||
			isPhoneChanged ||
			isNameChanged ||
			isOrgChanged ||
			isPasswordActuallyChanged;

		const is_otp = isEmailChanged || isPhoneChanged;

		if (isEmailChanged && newEmail) {
			const existingEmail = await prisma.client.findFirst({
				where: { email: newEmail, id: { not: userObj.id } },
			});
			if (existingEmail) {
				throw new APIError("This email is already in use by another account.", "hospitality.account.EMAIL_EXISTS", undefined, 409);
			}
		}

		if (isPhoneChanged && newPhone) {
			const existingPhone = await prisma.client.findFirst({
				where: { mobile_number: newPhone, id: { not: userObj.id } },
			});
			if (existingPhone) {
				throw new APIError("This phone number is already in use by another account.", "hospitality.account.PHONE_EXISTS", undefined, 409);
			}
		}

		const lastChangeDiscarded = !!(await getDeliveryEmployeeUpdateOtp(userObj.id, target_otp_id));

		if (!has_changed) {
			const response = {
				success: true as const,
				is_otp: false as const,
				has_changed: false as const,
				...resolveMessageTemplate("hospitality.employee.profile.UPDATE_SUCCESS"),
				message_debug: lastChangeDiscarded
					? "No data appears to have changed. The previous change request remains pending."
					: "No data appears to have changed, and no pending requests were found.",
			};
			return context.json(response as any, response.code as any);
		}

		if (is_otp) {
			if (isNameChanged || isOrgChanged || isPasswordActuallyChanged) {
				const updatePayload: any = {};
				if (full_name !== undefined) updatePayload.name = full_name.trim();
				if (organization_name !== undefined) updatePayload.organization_name = organization_name;
				if (hashedPassword) updatePayload.password = hashedPassword;

				await prisma.client.update({
					where: { id: userObj.id },
					data: updatePayload,
				});
			}

			const otp = Otp.generateOtp(4);
			const hashedOtp = await Bcrypt.generateHash({ data: otp });

			const savedOtpRecord = await getDeliveryEmployeeUpdateOtp(userObj.id, target_otp_id);

			const updatedOtpRecord = await upsertVerticalDeliveryUpdateOtp({
				otp_id: savedOtpRecord?.otp_id,
				user_id: userObj.id,
				role: "admin",
				otp: hashedOtp,
				email: newEmail || (userObj.email ?? undefined),
				mobile_number: newPhone,
				country_code: newCountryCode,
			});

			if (!updatedOtpRecord) {
				throw new APIError("Failed to save OTP", undefined, undefined, 500);
			}

			const otp_id = updatedOtpRecord.otp_id;

			setCookie(context, "otp_id", otp_id, {
				path: "/",
				httpOnly: true,
				maxAge: 60 * 5,
				sameSite: "Lax",
			});

			let otpSendFailed = false;
			try {
				await services.mailer.sendEmail({
					from: process.env.MAIL || "ankan@sqaby.com",
					subject: "OTP for Account Update",
					to: newEmail || userObj.email || "",
					text: `Your OTP to update your hospitality account is ${otp} (OTP Session ID: ${otp_id})`,
				});
			} catch (error) {
				otpSendFailed = true;
			}

			const baseMessage = lastChangeDiscarded
				? "New changes will only be applied after OTP verification. Additionally, the previous change request and its associated OTP have been discarded."
				: "New changes will only be applied after OTP verification.";

			const message_debug = otpSendFailed
				? `${baseMessage} However, the OTP delivery failed.`
				: `${baseMessage} The OTP has been successfully delivered.`;

			const response = {
				success: true as const,
				is_otp: true as const,
				has_changed: true as const,
				message_debug,
				...resolveMessageTemplate("hospitality.auth.login.OTP_SENT"),
				data: {
					otp_id,
					otp_details: {
						type: "email",
						values: [userObj.email || ""],
					},
				},
			};
			return context.json(response as any, response.code as any);
		}

		if (lastChangeDiscarded) {
			await deleteDeliveryEmployeeUpdateOtp(userObj.id);
		}

		const updatePayload: any = {};
		if (full_name !== undefined) updatePayload.name = full_name.trim();
		if (organization_name !== undefined) updatePayload.organization_name = organization_name;
		if (hashedPassword) updatePayload.password = hashedPassword;

		await prisma.client.update({
			where: { id: userObj.id },
			data: updatePayload,
		});

		const changes: any[] = [];
		if (isNameChanged) {
			changes.push({ field: "name", old_value: userObj.name, new_value: full_name });
		}
		if (isOrgChanged) {
			changes.push({ field: "organization_name", old_value: userObj.organization_name, new_value: organization_name });
		}
		if (isPasswordActuallyChanged) {
			changes.push({ field: "password", old_value: "********", new_value: "********" });
		}

		if (changes.length > 0) {
			await loggerService.log({
				category: "Profile",
				type: "Updation",
				actor: {
					id: userObj.id,
					name: userObj.name || "",
					role: "admin",
					table: "client",
				},
				client_id: userObj.id,
				subject: {
					id: userObj.id,
					name: userObj.name || "",
					type: "profile",
				},
				metadata: {
					changes
				}
			});
		}

		const response = {
			success: true as const,
			is_otp: false as const,
			has_changed: true as const,
			...resolveMessageTemplate("hospitality.employee.profile.UPDATE_SUCCESS"),
			message_debug: lastChangeDiscarded
				? "The previous change request and its associated OTP have been discarded."
				: "The account information has been updated successfully.",
		};

		return context.json(response as any, response.code as any);
	},
);
