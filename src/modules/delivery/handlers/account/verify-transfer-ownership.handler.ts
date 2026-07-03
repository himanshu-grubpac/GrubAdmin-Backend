import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { verifyTransferOwnershipRequestBodyValidator } from "delivery/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getDeliveryTransferOwnershipOtp, deleteDeliveryTransferOwnershipOtp } from "@/db/actions/delivery-transfer-ownership-otp.actions";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";

export const verifyTransferOwnershipHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	verifyTransferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, vertical_id, user } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const ip_address = context.req.header("x-forwarded-for") ||
			context.req.header("x-real-ip") ||
			context.req.header("cf-connecting-ip") ||
			"unknown";

		const normalizedEmail = user?.email ? user.email.trim().toLowerCase() : "unknown";

		const isLocked = await isOtpAttemptLocked({ email: normalizedEmail, ip_address });
		if (isLocked) {
			const remainingMinutes = await getOtpLockoutRemaining({ email: normalizedEmail, ip_address });
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429
			);
		}

		// 1. Get OTP record
		const otpRecord = await getDeliveryTransferOwnershipOtp(user_id, otp_id);

		if (!otpRecord) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP ID or OTP expired.", undefined, undefined, 404);
		}

		// 2. Verify hashed OTP
		const isMatch = await Bcrypt.compareHash({
			data: otp,
			hashedValue: otpRecord.otp,
		});

		if (!isMatch) {
			await incrementOtpAttempt({ email: normalizedEmail, ip_address });
			throw new APIError("Invalid OTP. Please try again.", undefined, undefined, 400);
		}

		// Reset brute force count on successful verification
		await resetOtpAttempt({ email: normalizedEmail, ip_address });

		const {
			transfer_mode,
			ids,
			name,
			organization_name,
			country_code,
			phone,
			email,
			country,
			state,
		} = otpRecord;

		// 3. Validate target client exists and perform Box transfer in a Transaction
		await prisma.$transaction(async (tx) => {
			const targetClient = await tx.client.findFirst({
				where: { email: email },
			});

			if (!targetClient) {
				throw new APIError("Account with this email does not exist.", undefined, undefined, 404);
			}

			// 4. Perform box update atomically
			if (transfer_mode === "all") {
				await tx.box.updateMany({
					where: {
						client_id: client_id,
					},
					data: {
						client_id: targetClient.id,
					},
				});
			} else if (transfer_mode === "selected" && ids && ids.length > 0) {
				await tx.box.updateMany({
					where: {
						id: { in: ids },
						client_id: client_id,
					},
					data: {
						client_id: targetClient.id,
					},
				});
			}
		});

		// 5. Cleanup OTP
		await deleteDeliveryTransferOwnershipOtp(user_id);

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				message: "Ownership transferred successfully.",
			},
			{
				status: 200,
			},
		);
	},
);
