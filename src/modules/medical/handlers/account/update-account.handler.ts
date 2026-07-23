import { createHandlers } from "@/utils/hono-factory.ts";
import { updateAccountRequestBodyValidator } from "medical/validators/account.validators.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { updateMedicalEmployee } from "@/db/actions/medical/employee.actions";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import {
	deleteMedicalEmployeeUpdateOtp,
	getMedicalEmployeeUpdateOtp,
	upsertMedicalEmployeeUpdateOtp,
} from "@/db/actions/medical-employee-update-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { client, vertical_medical_employee } from "@/db/types";
import { getCookie, setCookie } from "hono/cookie";
import { resolveMessageTemplate } from "@/utils/message.ts";
import { prisma } from "@/db";
import { assertEmailAvailableInVertical } from "@/utils/account";

export const updateAccountHandler = createHandlers(
	medicalAuthGuard(),
	updateAccountRequestBodyValidator,
	async (context) => {
		const { user, type, vertical_id } = context.var;

		const {
			full_name,
			organization_name,
			email: newEmail,
			country_code: newCountryCode,
			phone: newPhone,
			old_password,
			new_password,
			otp_id: otp_id_body,
			// confirm_new_password validated at schema level
		} = context.req.valid("json");

		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		// ── Split full_name into first/last ─────────────────────────────────
		let firstName: string | undefined;
		let lastName: string | undefined;

		if (full_name !== undefined) {
			const parts = full_name.trim().split(/\s+/);
			firstName = parts[0] || "";
			lastName = parts.slice(1).join(" ") || "";
		}

		// ── organization_name: only super_admin can change it ────────────────
		if (organization_name !== undefined && type !== "admin") {
			throw new APIError(undefined, "medical.common.ACCESS_DENIED", undefined, 403);
		}

		// ── Identity Verification & Password Update Logic ────────────────────
		let hashedPassword: string | undefined;
		let isPasswordActuallyChanged = false;

		if (new_password || old_password) {
			const hasExistingPassword = !!user.password;

			if (hasExistingPassword) {
				if (!old_password) {
					throw new APIError(undefined, "medical.account.PASSWORD_REQUIRED", undefined, 400);
				}

				const isOldPasswordCorrect = await Bcrypt.compareHash({
					data: old_password,
					hashedValue: user.password as string,
				});

				if (!isOldPasswordCorrect) {
					throw new APIError(undefined, "medical.auth.login.PASSWORD_INVALID", undefined, 400);
				}


				if (new_password && new_password === old_password) {
					throw new APIError(undefined, "medical.account.SAME_PASSWORD", undefined, 400);
				}
			} else {
				// No existing password, old_password is not required but new_password must be there
				if (!new_password) {
					throw new APIError(undefined, "medical.account.PASSWORD_REQUIRED", undefined, 400);
				}
			}

			if (new_password) {
				isPasswordActuallyChanged = true;
				hashedPassword = await Bcrypt.generateHash({ data: new_password });
			}
		}

		// ── Detect changes and OTP requirements ──────────────────────────────
		const isEmailChanged = !!(newEmail && newEmail !== user.email);
		const isPhoneChanged = !!(
			newPhone &&
			(newPhone !== user.mobile_number ||
				(newCountryCode && newCountryCode !== user.country_code))
		);

		const isNameChanged =
			type === "admin"
				? !!(
					full_name !== undefined && full_name.trim() !== (user as client).name
				)
				: !!(
					full_name !== undefined &&
					(firstName !== (user as vertical_medical_employee).first_name ||
						lastName !== (user as vertical_medical_employee).last_name)
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

		// ── Validate email and phone uniqueness BEFORE sending OTP ─────────
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
					throw new APIError("This email is already in use by another account.", "medical.account.EMAIL_EXISTS", undefined, 409);
				}
				throw error;
			}
		}

		if (isPhoneChanged && newPhone) {
			const existingPhone = await prisma.client.findFirst({
				where: { mobile_number: newPhone, id: { not: user.id } },
			}) || await prisma.vertical_medical_employee.findFirst({
				where: { mobile_number: newPhone, id: { not: user.id } },
			});
			if (existingPhone) {
				throw new APIError("This phone number is already in use by another account.", "medical.account.PHONE_EXISTS", undefined, 409);
			}
		}

		const lastChangeDiscarded = !!(await getMedicalEmployeeUpdateOtp(user.id, target_otp_id));

		if (!has_changed) {
			const response = {
				success: true as const,
				is_otp: false as const,
				has_changed: false as const,
				...resolveMessageTemplate("medical.employee.profile.UPDATE_SUCCESS"),
				message_debug: lastChangeDiscarded
					? "No data appears to have changed. The previous change request remains pending."
					: "No data appears to have changed, and no pending requests were found.",
			};
			return context.json(response as any, response.code as any);
		}

		if (is_otp) {
			// Perform non-contact immediate updates immediately (so they are not silently dropped)
			if (isNameChanged || isOrgChanged || isPasswordActuallyChanged) {
				const immediateUpdateData: any = {
					id: user.id,
					type,
				};
				if (firstName !== undefined) immediateUpdateData.first_name = firstName;
				if (lastName !== undefined) immediateUpdateData.last_name = lastName;
				if (organization_name !== undefined) {
					immediateUpdateData.organization = organization_name;
				}
				if (hashedPassword) {
					immediateUpdateData.password = hashedPassword;
				}
				await updateMedicalEmployee(immediateUpdateData);
			}

			// Generate 4-digit OTP and hash it before storing
			const otp = Otp.generateOtp(4);
			const hashedOtp = await Bcrypt.generateHash({ data: otp });

			const savedOtpRecord = await getMedicalEmployeeUpdateOtp(user.id, target_otp_id);

			const updatedOtpRecord = await upsertMedicalEmployeeUpdateOtp({
				otp_id: savedOtpRecord?.otp_id,
				user_id: user.id,
				role: type,
				otp: hashedOtp,
				email: newEmail || (user.email ?? undefined),
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
				maxAge: 60 * 5, // 5 minutes
				sameSite: "Lax",
			});

			let otpSendFailed = false;
			if (process.env.NODE_ENV !== "production") {
				console.log(`\n🔑 [DEV ONLY] Generated Account Update OTP: ${otp} (Session ID: ${otp_id})\n`);
			}
			try {
				await services.mailer.sendEmail({
					from: process.env.MAIL || "ankan@sqaby.com",
					subject: "OTP for Account Update",
					to: newEmail || user.email || "", // send to the new email address being updated, or fallback to current
					text: `Your OTP to update your delivery account is ${otp} (OTP Session ID: ${otp_id})`,
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
				...resolveMessageTemplate("medical.auth.login.OTP_SENT"),
				data: {
					otp_id,
					otp_details: {
						type: "email",
						values: [user.email || ""], // Send to current verified email
					},
				},
			};
			return context.json(response as any, response.code as any);
		}

		if (lastChangeDiscarded) {
			await deleteMedicalEmployeeUpdateOtp(user.id);
		}

		// ── Immediate update flow ────────────────────────────────────────────
		const updateData: any = {
			id: user.id,
			type,
		};

		// Name update
		if (firstName !== undefined) updateData.first_name = firstName;
		if (lastName !== undefined) updateData.last_name = lastName;

		// Organization — super_admin only
		if (organization_name !== undefined) {
			updateData.organization = organization_name; // mapped to organization_name in client table
		}

		// Password update handled at the identity verification stage
		if (hashedPassword) {
			updateData.password = hashedPassword;
		}

		// updateMedicalEmployee routes to client or vertical_medical_employee based on type
		await updateMedicalEmployee(updateData);

		// Log updation changes
		const changes: any[] = [];
		const u = user as any;
		if (isNameChanged) {
			const oldName = type === "admin" ? u.name : `${u.first_name} ${u.last_name || ""}`.trim();
			const newName = type === "admin" ? full_name : `${firstName} ${lastName || ""}`.trim();
			changes.push({ field: "name", old_value: oldName, new_value: newName });
		}
		if (isOrgChanged) changes.push({ field: "organization_name", old_value: u.organization_name, new_value: organization_name });
		if (isPasswordActuallyChanged) changes.push({ field: "password", old_value: "********", new_value: "********" });

		if (changes.length > 0) {
			const actorName = type === "admin"
				? u.name
				: `${u.first_name} ${u.last_name || ""}`.trim();

			await loggerService.log({
				category: "Profile",
				type: "Updation",
				actor: {
					id: u.id,
					name: actorName,
					role: type,
					table: type === "admin" ? "client" : "vertical_medical_employee",
				},
				client_id: type === "admin" ? u.id : u.client_id,
				subject: {
					id: u.id,
					name: actorName,
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
			...resolveMessageTemplate("medical.employee.profile.UPDATE_SUCCESS"),
			message_debug: lastChangeDiscarded
				? "The previous change request and its associated OTP have been discarded."
				: "The account information has been updated successfully.",
		};

		return context.json(response as any, response.code as any);
	},
);

