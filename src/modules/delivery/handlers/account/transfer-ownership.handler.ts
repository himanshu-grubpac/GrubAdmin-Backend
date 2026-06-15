import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { transferOwnershipRequestBodyValidator } from "delivery/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { Otp as OtpUtil } from "@/utils/otp";
import { createDeliveryTransferOwnershipOtp } from "@/db/actions/delivery-transfer-ownership-otp.actions";
import { ulid } from "ulid";
import { services } from "@/services";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { client } from "@/db/types";

export const transferOwnershipHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	transferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, user } = context.var;
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

		if (!user || !user.email) {
			throw new APIError("User email not found", undefined, undefined, 404);
		}

		// Prevent self-transfer
		if (email.trim().toLowerCase() === user.email.trim().toLowerCase()) {
			throw new APIError("You cannot transfer ownership of your Grubpacs to your own account.", "delivery.account.SELF_TRANSFER_BLOCKED", undefined, 400);
		}

		const uniqueIds = ids ? [...new Set(ids)] : [];

		// 1. Validate box ownership if mode is selected
		if (transfer_mode === "selected") {
			if (uniqueIds.length === 0) {
				throw new APIError("Please select at least one Grubpac to transfer", undefined, undefined, 400);
			}

			const boxes = await prisma.box.findMany({
				where: {
					id: { in: uniqueIds },
					client_id: client_id,
				},
				select: { id: true },
			});

			if (boxes.length !== uniqueIds.length) {
				throw new APIError("Some selected Grubpacs are invalid or do not belong to you", undefined, undefined, 400);
			}
		}

		// 2. Generate 4-digit OTP and hash it
		const otp = OtpUtil.generateOtp(4);
		const hashedOtp = await Bcrypt.generateHash({ data: otp });
		const otp_id = ulid();

		// 3. Save to MongoDB
		await createDeliveryTransferOwnershipOtp({
			user_id: user_id,
			otp: hashedOtp,
			otp_id,
			transfer_mode,
			ids: uniqueIds,
			name,
			organization_name,
			country_code,
			phone,
			email,
			country,
			state,
		});

		// 4. Send Email
		if (process.env.NODE_ENV !== "production") {
			console.log(`\n🔑 [DEV ONLY] Generated Ownership Transfer OTP: ${otp} (Session ID: ${otp_id})\n`);
		}
		try {
			await services.mailer.sendEmail({
				to: user.email,
				from: process.env.MAIL || "support@sqaby.com",
				subject: "Grubpac Ownership Transfer OTP",
				html: `<p>Your OTP for ownership transfer is: <b>${otp}</b>. Valid for 10 minutes.</p>`,
			});
		} catch (error) {
			console.error("Failed to send transfer OTP email:", error);
		}

		// Log the ownership transfer request correctly
		try {
			await loggerService.log({
				category: "Profile",
				type: "Ownership",
				actor: { 
					id: user.id, 
					name: (user as client).name || "Admin", 
					role: "admin", 
					table: "client" 
				},
				client_id: client_id,
				subject: { id: user.id, name: user.email || "Unknown", type: "account" },
				metadata: { transfer_mode, box_count: transfer_mode === "all" ? "all" : uniqueIds.length, recipient_email: email }
			});
		} catch (err) { }

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
