import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import {
	getAdminUpdateOtp,
	upsertAdminUpdateOtp,
} from "@/db/actions/admin-update-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { getUniqueAdmin } from "@/db/actions/admin.actions.ts";

export const updateAccountResendOtpHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { user_id } = context.var;

		const oldAdminUpdateOtp = await getAdminUpdateOtp(user_id);

		if (!oldAdminUpdateOtp) {
			throw new APIError(
				"No old otp has been sent! Please first initiate the update request",
				undefined,
				undefined,
				400,
			);
		}

		const otp = Otp.generateOtp(4);

		await upsertAdminUpdateOtp({
			user_id,
			otp,
		});

		if (oldAdminUpdateOtp.email) {
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "OTP for Account Update",
				to: oldAdminUpdateOtp.email,
				text: `Your account update OTP is ${otp}`,
			});
		} else {
			// TODO: this would be altered once we get the DLT!
			const admin = await getUniqueAdmin({
				id: user_id,
			});

			if (!admin) {
				throw new APIError("No admin found", undefined, undefined, 404);
			}

			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "OTP for Account Update",
				to: admin.user.email,
				text: `Your account update OTP is ${otp}`,
			});
		}

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
