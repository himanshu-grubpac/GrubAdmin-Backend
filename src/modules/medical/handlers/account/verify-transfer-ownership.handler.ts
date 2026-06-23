import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import {
	transferEntireAccountRequestBodyValidator,
	verifyTransferOwnershipRequestBodyValidator,
} from "medical/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import {
	getMedicalTransferOwnershipOtp,
	deleteMedicalTransferOwnershipOtp,
} from "@/db/actions/medical-transfer-ownership-otp.actions";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { ulid } from "ulid";
import { Otp as OtpUtil } from "@/utils/otp";
import { createMedicalTransferOwnershipOtp } from "@/db/actions/medical-transfer-ownership-otp.actions";
import { services } from "@/services";
import { DepartmentLog, DeliveryEmployeeLog, GrubpacLog, ClientAdminLog } from "@/db/mongo-schema";
import { resolveMessageTemplate } from "@/utils/message";
import type { client } from "@/db/types";

const resolveTargetClient = async (
	tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
	vertical_id: string,
	recipient: {
		name: string;
		organization_name: string;
		country_code: string;
		phone: string;
		email: string;
		country: string;
		state: string;
	},
) => {
	let targetClient = await tx.client.findFirst({
		where: { email: recipient.email },
	});

	if (!targetClient) {
		targetClient = await tx.client.create({
			data: {
				name: recipient.name,
				organization_name: recipient.organization_name,
				country_code: recipient.country_code,
				mobile_number: recipient.phone,
				email: recipient.email,
				country: recipient.country,
				state: recipient.state,
				client_display_id: `CLI-${ulid()}`,
				vertical: { connect: { id: vertical_id } },
				status: "active",
			},
		});
	}

	return targetClient;
};

export const verifyTransferOwnershipHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	verifyTransferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, vertical_id, user } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			context.req.header("cf-connecting-ip") ||
			"unknown";

		const normalizedEmail = user?.email ? user.email.trim().toLowerCase() : "unknown";

		if (await isOtpAttemptLocked({ email: normalizedEmail, ip_address })) {
			const remainingMinutes = await getOtpLockoutRemaining({ email: normalizedEmail, ip_address });
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const otpRecord = await getMedicalTransferOwnershipOtp(user_id, otp_id);

		if (!otpRecord) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP ID or OTP expired.", undefined, undefined, 404);
		}

		if (otpRecord.transfer_mode === "entire_account") {
			throw new APIError("Use /account/transfer-entire-account/verify for full account transfers.", undefined, undefined, 400);
		}

		const isMatch = await Bcrypt.compareHash({ data: otp, hashedValue: otpRecord.otp });

		if (!isMatch) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP. Please try again.", undefined, undefined, 400);
		}

		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		const { transfer_mode, ids, name, organization_name, country_code, phone, email, country, state } = otpRecord;

		await prisma.$transaction(async (tx) => {
			const targetClient = await resolveTargetClient(tx, vertical_id, {
				name,
				organization_name,
				country_code,
				phone,
				email,
				country,
				state,
			});

			if (transfer_mode === "all") {
				await tx.box.updateMany({
					where: { client_id },
					data: { client_id: targetClient.id },
				});
			} else if (transfer_mode === "selected" && ids && ids.length > 0) {
				await tx.box.updateMany({
					where: { id: { in: ids }, client_id },
					data: { client_id: targetClient.id },
				});
			}
		});

		await deleteMedicalTransferOwnershipOtp(user_id);

		const response = resolveMessageTemplate("medical.department.transfer.SUCCESS", { id: client_id, name: "" });

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: response.message || "Ownership transferred successfully.",
			},
			{ status: 200 },
		);
	},
);

export const transferEntireAccountHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	transferEntireAccountRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, user } = context.var;
		const { name, organization_name, country_code, phone, email, country, state } = context.req.valid("json");

		if (!user?.email) {
			throw new APIError("User email not found", undefined, undefined, 404);
		}

		if (email.trim().toLowerCase() === user.email.trim().toLowerCase()) {
			throw new APIError("You cannot transfer the account to yourself.", undefined, undefined, 400);
		}

		const otp = OtpUtil.generateOtp(4);
		const hashedOtp = await Bcrypt.generateHash({ data: otp });
		const otp_id = ulid();

		await createMedicalTransferOwnershipOtp({
			user_id,
			otp: hashedOtp,
			otp_id,
			transfer_mode: "entire_account",
			name,
			organization_name,
			country_code,
			phone,
			email,
			country,
			state,
		});

		if (process.env.NODE_ENV !== "production") {
			console.log(`\n🔑 [DEV ONLY] Entire Account Transfer OTP: ${otp} (Session ID: ${otp_id})\n`);
		}
		try {
			await services.mailer.sendEmail({
				to: user.email,
				from: process.env.MAIL || "support@sqaby.com",
				subject: "Complete Account Transfer OTP",
				html: `<p>Your OTP for complete account transfer is: <b>${otp}</b>. Valid for 10 minutes.</p>`,
			});
		} catch (error) {
			console.error("Failed to send transfer OTP email:", error);
		}

		return context.json<APIResponse<{ otp_id: string }>>(
			{ success: true, code: 200, data: { otp_id } },
			{ status: 200 },
		);
	},
);

export const verifyTransferEntireAccountHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	verifyTransferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, vertical_id, user } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			"unknown";
		const normalizedEmail = user?.email ? user.email.trim().toLowerCase() : "unknown";

		if (await isOtpAttemptLocked({ email: normalizedEmail, ip_address })) {
			const remainingMinutes = await getOtpLockoutRemaining({ email: normalizedEmail, ip_address });
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const otpRecord = await getMedicalTransferOwnershipOtp(user_id, otp_id);

		if (!otpRecord || otpRecord.transfer_mode !== "entire_account") {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP ID or OTP expired.", undefined, undefined, 404);
		}

		const isMatch = await Bcrypt.compareHash({ data: otp, hashedValue: otpRecord.otp });
		if (!isMatch) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP. Please try again.", undefined, undefined, 400);
		}

		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		const { name, organization_name, country_code, phone, email, country, state } = otpRecord;

		const targetClientId = await prisma.$transaction(async (tx) => {
			const targetClient = await resolveTargetClient(tx, vertical_id, {
				name,
				organization_name,
				country_code,
				phone,
				email,
				country,
				state,
			});

			await tx.box.updateMany({ where: { client_id }, data: { client_id: targetClient.id } });
			await tx.vertical_medical_department.updateMany({
				where: { client_id },
				data: { client_id: targetClient.id },
			});
			await tx.vertical_medical_employee.updateMany({
				where: { client_id },
				data: { client_id: targetClient.id },
			});
			await tx.notification.updateMany({
				where: { client_id },
				data: { client_id: targetClient.id },
			});

			return targetClient.id;
		});

		await Promise.all([
			ClientAdminLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
			DeliveryEmployeeLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
			DepartmentLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
			GrubpacLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
		]);

		await deleteMedicalTransferOwnershipOtp(user_id);

		const response = resolveMessageTemplate("medical.department.transfer.BULK_SUCCESS");

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: response.message || "Complete account transferred successfully.",
			},
			{ status: 200 },
		);
	},
);
