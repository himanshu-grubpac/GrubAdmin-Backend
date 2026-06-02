import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { verifyTransferOwnershipRequestBodyValidator } from "food/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getFoodTransferOwnershipOtp, deleteFoodTransferOwnershipOtp } from "@/db/actions/food-transfer-ownership-otp.actions";
import { getUniqueClient, createClient } from "@/db/actions/client.actions";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/otp-attempt.actions";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { ulid } from "ulid";

export const verifyTransferOwnershipHandler = createHandlers(
	foodAuthGuard(["admin"]),
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
		const otpRecord = await getFoodTransferOwnershipOtp(user_id, otp_id);

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

		// 3. Atomically perform Client generation and Box updating in a Transaction
		await prisma.$transaction(async (tx) => {
			let targetClient = await tx.client.findFirst({
				where: { email: email },
			});

			if (!targetClient) {
				// Create new client atomically
				targetClient = await tx.client.create({
					data: {
						name,
						organization_name,
						country_code,
						mobile_number: phone,
						email,
						country,
						state,
						client_display_id: `CLI-${ulid()}`, // collision-safe
						vertical: {
							connect: { id: vertical_id }
						},
						status: "active",
					},
				});
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
		await deleteFoodTransferOwnershipOtp(user_id);

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
