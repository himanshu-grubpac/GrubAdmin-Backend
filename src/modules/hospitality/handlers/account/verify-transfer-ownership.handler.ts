import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import {
	transferEntireAccountRequestBodyValidator,
	verifyTransferOwnershipRequestBodyValidator,
} from "hospitality/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import {
	getHospitalityTransferOwnershipOtp,
	deleteHospitalityTransferOwnershipOtp,
	createHospitalityTransferOwnershipOtp,
} from "@/db/actions/hospitality-transfer-ownership-otp.actions";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/hospitality-otp-attempt.actions";
import { getHospitalityMailFrom, isHospitalityOtpDevLogEnabled, logHospitalityOtpDev } from "hospitality/handlers/auth/auth.utils";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { ulid } from "ulid";
import { Otp as OtpUtil } from "@/utils/otp";
import { services } from "@/services";
import { RestaurantLog, GrubpacLog, ClientAdminLog } from "@/db/mongo-schema";
import { resolveMessageTemplate } from "@/utils/message";
import type { client } from "@/db/types";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import { getHospitalityUserOtpLockKey } from "hospitality/handlers/auth/hospitality-otp-lockout";
import { queueHospitalityMail } from "hospitality/utils/hospitality-mail-queue";

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
	const targetClient = await tx.client.findFirst({
		where: {
			email: recipient.email,
			vertical: { name: HOSPITALITY_VERTICAL_NAME },
			status: "active",
		},
		include: { vertical: true },
	});

	if (!targetClient) {
		throw new APIError("Account with this email does not exist.", undefined, undefined, 404);
	}

	return targetClient;
};

export const verifyTransferOwnershipHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	verifyTransferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, vertical_id, user } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const lockKey = getHospitalityUserOtpLockKey(user_id, user?.email);

		if (await isOtpAttemptLocked(lockKey)) {
			const remainingMinutes = await getOtpLockoutRemaining(lockKey);
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const otpRecord = await getHospitalityTransferOwnershipOtp(user_id, otp_id);

		if (!otpRecord) {
			await incrementOtpAttempt(lockKey);
			throw new APIError("Invalid OTP ID or OTP expired.", undefined, undefined, 404);
		}

		if (otpRecord.transfer_mode === "entire_account") {
			throw new APIError("Use /account/transfer-entire-account/verify for full account transfers.", undefined, undefined, 400);
		}

		const isMatch = await Bcrypt.compareHash({ data: otp, hashedValue: otpRecord.otp });

		if (!isMatch) {
			await incrementOtpAttempt(lockKey);
			throw new APIError("Invalid OTP. Please try again.", undefined, undefined, 400);
		}

		await resetOtpAttempt(lockKey);

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
				await tx.vertical_hospitality_floor_box.deleteMany({
					where: { box: { client_id } },
				});
				await tx.box.updateMany({
					where: { client_id },
					data: { client_id: targetClient.id },
				});
			} else if (transfer_mode === "selected" && ids && ids.length > 0) {
				await tx.vertical_hospitality_floor_box.deleteMany({
					where: { box_id: { in: ids } },
				});
				await tx.box.updateMany({
					where: { id: { in: ids }, client_id },
					data: { client_id: targetClient.id },
				});
			}
		});

		await deleteHospitalityTransferOwnershipOtp(user_id);

		const response = resolveMessageTemplate("hospitality.floor.transfer.SUCCESS", { id: client_id, name: "" });

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
	hospitalityAuthGuard(["admin"]),
	transferEntireAccountRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, user } = context.var;
		const { name, organization_name, country_code, phone, email, country, state } = context.req.valid("json");

		if (!user?.email) {
			throw new APIError("User email not found", undefined, undefined, 404);
		}

		const ownerEmail = user.email;

		if (email.trim().toLowerCase() === ownerEmail.trim().toLowerCase()) {
			throw new APIError("You cannot transfer the account to yourself.", undefined, undefined, 400);
		}

		const otp = OtpUtil.generateOtp(4);
		const hashedOtp = await Bcrypt.generateHash({ data: otp });
		const otp_id = ulid();

		await deleteHospitalityTransferOwnershipOtp(user_id);

		await createHospitalityTransferOwnershipOtp({
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

		if (isHospitalityOtpDevLogEnabled()) {
			logHospitalityOtpDev({
				email: ownerEmail,
				otp,
				otp_id,
				for_what: "transfer-entire-account",
			});
		}
		queueHospitalityMail({
			label: "transfer-entire-account",
			send: () =>
				services.mailer.sendEmail({
					to: ownerEmail,
					from: getHospitalityMailFrom(),
					subject: "Complete Account Transfer OTP",
					html: `<p>Your OTP for complete account transfer is: <b>${otp}</b>. Valid for 10 minutes.</p>`,
				}),
			onFailure: async () => {
				logHospitality(context, "error", "hospitality_transfer_entire_account_mail_failed", {
					client_id,
					otp_id,
				});
			},
		});

		return context.json<APIResponse<{ otp_id: string; otp?: string }>>(
			{
				success: true,
				code: 200,
				data: {
					otp_id,
					...(isHospitalityOtpDevLogEnabled() ? { otp } : {}),
				},
			},
			{ status: 200 },
		);
	},
);

export const verifyTransferEntireAccountHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	verifyTransferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, vertical_id, user } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const lockKey = getHospitalityUserOtpLockKey(user_id, user?.email);

		if (await isOtpAttemptLocked(lockKey)) {
			const remainingMinutes = await getOtpLockoutRemaining(lockKey);
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const otpRecord = await getHospitalityTransferOwnershipOtp(user_id, otp_id);

		if (!otpRecord || otpRecord.transfer_mode !== "entire_account") {
			await incrementOtpAttempt(lockKey);
			throw new APIError("Invalid OTP ID or OTP expired.", undefined, undefined, 404);
		}

		const isMatch = await Bcrypt.compareHash({ data: otp, hashedValue: otpRecord.otp });
		if (!isMatch) {
			await incrementOtpAttempt(lockKey);
			throw new APIError("Invalid OTP. Please try again.", undefined, undefined, 400);
		}

		await resetOtpAttempt(lockKey);

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
			await tx.vertical_hospitality_floor.updateMany({
				where: { client_id },
				data: { client_id: targetClient.id },
			});
			await tx.restaurant.updateMany({
				where: { client_id },
				data: { client_id: targetClient.id },
			});
			await tx.notification.updateMany({
				where: { client_id },
				data: { client_id: targetClient.id },
			});

			await tx.client.update({
				where: { id: client_id },
				data: { status: "inactive" },
			});

			return targetClient.id;
		});

		await Promise.all([
			ClientAdminLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
			RestaurantLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
			GrubpacLog.updateMany({ client_id }, { $set: { client_id: targetClientId } }),
		]);

		await deleteHospitalityTransferOwnershipOtp(user_id);

		const response = resolveMessageTemplate("hospitality.floor.transfer.BULK_SUCCESS");

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
