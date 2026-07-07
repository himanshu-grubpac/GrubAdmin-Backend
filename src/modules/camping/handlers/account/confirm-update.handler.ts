import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { confirmUpdateOtpRequestBodyValidator } from "camping/validators/account.validators";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import {
	getSavedCampingOtp,
	compareOtp,
	deleteSavedCampingOtp,
} from "@/db/actions/camping-otp.actions.ts";
import { getCookie } from "hono/cookie";

export const confirmUpdateAccountHandler = createHandlers(
	campingAuthGuard(),
	confirmUpdateOtpRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const client = await prisma.client.findUnique({
			where: { id: client_id },
		});

		if (!client?.email) {
			throw new APIError(undefined, "camping.auth.login.EMAIL_NOT_FOUND");
		}

		const savedOtp = await getSavedCampingOtp(client.email, target_otp_id);

		if (!savedOtp) {
			throw new APIError(undefined, "camping.auth.login.OTP_EXPIRED");
		}

		const isMatch = await compareOtp(otp, savedOtp.otp);
		if (!isMatch) {
			throw new APIError(undefined, "camping.auth.login.OTP_INVALID");
		}

		const pendingChanges = savedOtp.metadata?.pending_changes;
		if (pendingChanges && typeof pendingChanges === "object") {
			await prisma.client.update({
				where: { id: client_id },
				data: pendingChanges,
			});
		} else {
			throw new APIError(undefined, "camping.account.NO_CHANGE_REQUESTS");
		}

		await deleteSavedCampingOtp(client.email);

		return context.json({
			success: true,
			code: 200,
			message: "Profile updated successfully",
		});
	},
);
