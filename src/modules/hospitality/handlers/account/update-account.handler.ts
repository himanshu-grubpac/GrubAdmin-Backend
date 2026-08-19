import { createHandlers } from "@/utils/hono-factory.ts";
import { updateAccountRequestBodyValidator } from "hospitality/validators/account.validators.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { loggerService } from "@/services/system-log.ts";
import {
	deleteDeliveryEmployeeUpdateOtp,
	getDeliveryEmployeeUpdateOtp,
	upsertVerticalDeliveryUpdateOtp,
} from "@/db/actions/delivery-employee-update-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { client, vertical_hospitality_employee } from "@/db/types";
import { getCookie, setCookie } from "hono/cookie";
import { resolveMessageTemplate } from "@/utils/message.ts";
import { prisma } from "@/db";
import { assertEmailAvailableInVertical } from "@/utils/account";
import {
	getHospitalityMailFrom,
	logHospitalityOtpDev,
} from "hospitality/handlers/auth/auth.utils";
import { updateHospitalityAccountProfile } from "@/db/actions/hospitality/employee.actions";

const resolveOtpDetailsType = (isEmailChanged: boolean, isPhoneChanged: boolean) => {
	if (isEmailChanged && isPhoneChanged) return "both";
	if (isPhoneChanged) return "phone";
	return "email";
};

export const updateAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	updateAccountRequestBodyValidator,
	async (context) => {
		const { user, type, vertical_id, client_id: tenantClientId, password_hash, is_password_set } = context.var;

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

		let firstName: string | undefined;
		let lastName: string | undefined;

		if (full_name !== undefined) {
			const parts = full_name.trim().split(/\s+/);
			firstName = parts[0] || "";
			lastName = parts.slice(1).join(" ") || "";
		}

		if (type !== "admin") {
			const restrictedFieldRequested =
				organization_name !== undefined ||
				newEmail !== undefined ||
				newPhone !== undefined ||
				newCountryCode !== undefined ||
				full_name !== undefined;

			if (restrictedFieldRequested) {
				throw new APIError(undefined, "hospitality.common.ACCESS_DENIED", undefined, 403);
			}
		}

		if (organization_name !== undefined && type !== "admin") {
			throw new APIError(undefined, "hospitality.common.ACCESS_DENIED", undefined, 403);
		}

		let hashedPassword: string | undefined;
		let isPasswordActuallyChanged = false;

		if (new_password || old_password) {
			const hasExistingPassword = is_password_set;

			if (hasExistingPassword) {
				if (!old_password) {
					throw new APIError(undefined, "hospitality.account.PASSWORD_REQUIRED", undefined, 400);
				}

				if (!password_hash) {
					throw new APIError(undefined, "hospitality.account.PASSWORD_REQUIRED", undefined, 400);
				}

				const isOldPasswordCorrect = await Bcrypt.compareHash({
					data: old_password,
					hashedValue: password_hash,
				});

				if (!isOldPasswordCorrect) {
					throw new APIError(undefined, "hospitality.auth.login.PASSWORD_INVALID", undefined, 400);
				}

				if (new_password && new_password === old_password) {
					throw new APIError(undefined, "hospitality.account.SAME_PASSWORD", undefined, 400);
				}
			} else if (!new_password) {
				throw new APIError(undefined, "hospitality.account.PASSWORD_REQUIRED", undefined, 400);
			}

			if (new_password) {
				isPasswordActuallyChanged = true;
				hashedPassword = await Bcrypt.generateHash({ data: new_password });
			}
		}

		const isEmailChanged = !!(newEmail && newEmail !== user.email);
		const isPhoneChanged = !!(
			newPhone &&
			(newPhone !== user.mobile_number ||
				(newCountryCode && newCountryCode !== user.country_code))
		);

		const isNameChanged =
			type === "admin"
				? !!(full_name !== undefined && full_name.trim() !== (user as client).name)
				: !!(
						full_name !== undefined &&
						(firstName !== (user as vertical_hospitality_employee).first_name ||
							lastName !== (user as vertical_hospitality_employee).last_name)
					);

		const isOrgChanged = !!(
			organization_name !== undefined &&
			type === "admin" &&
			organization_name !== (user as client).organization_name
		);

		const has_changed =
			isEmailChanged ||
			isPhoneChanged ||
			isNameChanged ||
			isOrgChanged ||
			isPasswordActuallyChanged;

		const is_otp = isEmailChanged || isPhoneChanged;

		if (isEmailChanged && newEmail) {
			if (!vertical_id) {
				throw new APIError("Client vertical is not configured", undefined, undefined, 400);
			}
			try {
				await assertEmailAvailableInVertical(newEmail, vertical_id, {
					excludeClientId: type === "admin" ? user.id : undefined,
					excludeEmployeeId: type !== "admin" ? user.id : undefined,
				});
			} catch (error) {
				if (error instanceof APIError && error.code === 409) {
					throw new APIError(
						"This email is already in use by another account.",
						"hospitality.account.EMAIL_EXISTS",
						undefined,
						409,
					);
				}
				throw error;
			}
		}

		if (isPhoneChanged && newPhone) {
			const existingClientPhone = await prisma.client.findFirst({
				where: { mobile_number: newPhone, id: { not: user.id } },
			});
			const existingEmployeePhone = await prisma.vertical_hospitality_employee.findFirst({
				where: { mobile_number: newPhone, id: { not: user.id } },
			});
			if (existingClientPhone || existingEmployeePhone) {
				throw new APIError(
					"This phone number is already in use by another account.",
					"hospitality.account.PHONE_EXISTS",
					undefined,
					409,
				);
			}
		}

		const lastChangeDiscarded = !!(await getDeliveryEmployeeUpdateOtp(user.id, target_otp_id));

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
				await updateHospitalityAccountProfile({
					id: user.id,
					type,
					first_name: firstName,
					last_name: lastName,
					organization: organization_name,
					password: hashedPassword,
					increment_auth_token_version: isPasswordActuallyChanged && type === "admin",
				});
			}

			const otp = Otp.generateOtp(4);
			const hashedOtp = await Bcrypt.generateHash({ data: otp });

			const savedOtpRecord = await getDeliveryEmployeeUpdateOtp(user.id, target_otp_id);

			const updatedOtpRecord = await upsertVerticalDeliveryUpdateOtp({
				otp_id: savedOtpRecord?.otp_id,
				user_id: user.id,
				role: type === "admin" ? "admin" : "manager",
				otp: hashedOtp,
				email: newEmail || (user.email ?? undefined),
				mobile_number: newPhone,
				country_code: newCountryCode,
				first_name: isNameChanged ? firstName : undefined,
				last_name: isNameChanged ? lastName : undefined,
				organization_name: isOrgChanged ? organization_name : undefined,
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

			const otpRecipient = newEmail || user.email || "";
			logHospitalityOtpDev({
				email: otpRecipient,
				otp,
				otp_id,
				for_what: "account-update",
			});

			try {
				await services.mailer.sendEmail({
					from: getHospitalityMailFrom(),
					subject: "OTP for Account Update",
					to: otpRecipient,
					text: `Your OTP to update your hospitality account is ${otp} (OTP Session ID: ${otp_id})`,
				});
			} catch {
				await deleteDeliveryEmployeeUpdateOtp(user.id);
				throw new APIError(undefined, "hospitality.auth.login.OTP_SEND_FAILED");
			}

			const baseMessage = lastChangeDiscarded
				? "New changes will only be applied after OTP verification. Additionally, the previous change request and its associated OTP have been discarded."
				: "New changes will only be applied after OTP verification.";

			const otpType = resolveOtpDetailsType(isEmailChanged, isPhoneChanged);

			const response = {
				success: true as const,
				is_otp: true as const,
				has_changed: true as const,
				message_debug: `${baseMessage} The OTP has been successfully delivered.`,
				...resolveMessageTemplate("hospitality.auth.login.OTP_SENT"),
				data: {
					otp_id,
					otp_details: {
						type: otpType,
						values: [
							otpType === "phone" || otpType === "both"
								? `${newCountryCode || user.country_code || ""} ${newPhone || user.mobile_number || ""}`.trim()
								: newEmail || user.email || "",
						],
					},
				},
			};
			return context.json(response as any, response.code as any);
		}

		if (lastChangeDiscarded) {
			await deleteDeliveryEmployeeUpdateOtp(user.id);
		}

		await updateHospitalityAccountProfile({
			id: user.id,
			type,
			first_name: firstName,
			last_name: lastName,
			organization: organization_name,
			password: hashedPassword,
			increment_auth_token_version: isPasswordActuallyChanged && type === "admin",
		});

		const changes: { field: string; old_value: string; new_value: string }[] = [];
		const u = user as client & vertical_hospitality_employee;
		if (isNameChanged) {
			const oldName =
				type === "admin"
					? u.name
					: `${u.first_name} ${u.last_name || ""}`.trim();
			const newName =
				type === "admin" ? full_name : `${firstName} ${lastName || ""}`.trim();
			changes.push({ field: "name", old_value: oldName || "", new_value: newName || "" });
		}
		if (isOrgChanged) {
			changes.push({
				field: "organization_name",
				old_value: u.organization_name || "",
				new_value: organization_name || "",
			});
		}
		if (isPasswordActuallyChanged) {
			changes.push({ field: "password", old_value: "********", new_value: "********" });
		}

		if (changes.length > 0) {
			const actorName =
				type === "admin"
					? u.name
					: `${u.first_name} ${u.last_name || ""}`.trim();

			await loggerService.log({
				category: "Profile",
				type: "Updation",
				actor: {
					id: u.id,
					name: actorName || "",
					role: type,
					table: type === "admin" ? "client" : "vertical_hospitality_employee",
				},
				client_id: type === "admin" ? u.id : (tenantClientId ?? u.client_id ?? undefined),
				subject: {
					id: u.id,
					name: actorName || "",
					type: "profile",
				},
				metadata: { changes },
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
