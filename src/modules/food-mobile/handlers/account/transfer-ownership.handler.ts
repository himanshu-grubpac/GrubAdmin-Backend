import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { transferOwnershipRequestBodyValidator } from "food-mobile/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { Otp as OtpUtil } from "@/utils/otp";
import { createFoodTransferOwnershipOtp } from "@/db/actions/food-transfer-ownership-otp.actions";
import { ulid } from "ulid";
import { services } from "@/services";

export const transferOwnershipHandler = createHandlers(
	foodAuthGuard(["admin"]),
	transferOwnershipRequestBodyValidator,
	async (context) => {
		const { user, client_id, user_id } = context.var;
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
		} = context.req.valid("json");

		if (!client_id) {
			throw new APIError("Client context missing", undefined, undefined, 403);
		}

		// 1. Validate box ownership if mode is selected
		if (transfer_mode === "selected") {
			if (!ids || ids.length === 0) {
				throw new APIError("Please select at least one Grubpac to transfer", undefined, undefined, 400);
			}

			const boxes = await prisma.box.findMany({
				where: {
					id: { in: ids },
					client_id: client_id,
				},
				select: { id: true },
			});

			if (boxes.length !== ids.length) {
				throw new APIError("Some selected Grubpacs are invalid or do not belong to you", undefined, undefined, 400);
			}
		}

		// 2. Generate OTP
		const otp = OtpUtil.generateOtp(4);
		const otp_id = ulid();

		// 3. Save to MongoDB
		await createFoodTransferOwnershipOtp({
			user_id: user_id,
			otp,
			otp_id,
			transfer_mode,
			ids,
			name,
			organization_name,
			country_code,
			phone,
			email,
			country,
			state,
		});

		// 4. Send Email
		try {
			await services.mailer.sendEmail({
				to: user.email!,
				from: "support@sqaby.com", // Example from email
				subject: "Grubpac Ownership Transfer OTP",
				html: `<p>Your OTP for ownership transfer is: <b>${otp}</b>. Valid for 10 minutes.</p>`,
			});
		} catch (error) {
			console.error("Failed to send transfer OTP email:", error);
		}

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				data: {
					otp_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);
