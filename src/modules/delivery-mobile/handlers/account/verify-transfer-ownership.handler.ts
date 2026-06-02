import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { verifyTransferOwnershipRequestBodyValidator } from "delivery-mobile/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { getDeliveryTransferOwnershipOtp, deleteDeliveryTransferOwnershipOtp } from "@/db/actions/delivery-transfer-ownership-otp.actions";
import { getUniqueClient, createClient } from "@/db/actions/client.actions";

export const verifyTransferOwnershipHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	verifyTransferOwnershipRequestBodyValidator,
	async (context) => {
		const { user_id, client_id, vertical_id } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		// 1. Get OTP record
		const otpRecord = await getDeliveryTransferOwnershipOtp(user_id, otp_id);

		if (!otpRecord) {
			throw new APIError("Invalid OTP ID or OTP expired.", undefined, undefined, 404);
		}

		// 2. Verify OTP
		if (otpRecord.otp !== otp) {
			throw new APIError("Invalid OTP. Please try again.", undefined, undefined, 400);
		}

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

		// 3. Find or Create new client
		let targetClient = await getUniqueClient({ email });

		if (!targetClient) {
			// Create new client
			targetClient = await createClient({
				data: {
					name,
					organization_name,
					country_code,
					mobile_number: phone,
					email,
					country,
					state,
					client_display_id: `CLI-${Date.now()}`, // Simple display ID generation
					vertical: {
						connect: { id: vertical_id }
					},
					status: "active",
				},
			});
		}

		// 4. Perform transfer
		if (transfer_mode === "all") {
			await prisma.box.updateMany({
				where: {
					client_id: client_id,
				},
				data: {
					client_id: targetClient.id,
				},
			});
		} else if (transfer_mode === "selected" && ids && ids.length > 0) {
			await prisma.box.updateMany({
				where: {
					id: { in: ids },
					client_id: client_id,
				},
				data: {
					client_id: targetClient.id,
				},
			});
		}

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
