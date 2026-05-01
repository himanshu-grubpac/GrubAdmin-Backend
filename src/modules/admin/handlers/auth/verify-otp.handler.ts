import { createHandlers } from "@/utils/hono-factory";
import { verifyOtpRequestBodyValidator } from "../../validators/auth.validators";
import { deleteSavedOtp, getSavedOtp } from "@/db/actions/otp.actions";
import { APIError } from "@/types/error";
import { getUniqueAdmin, updateAdmin } from "@/db/actions/admin.actions";
import { JWT } from "@/utils/jwt";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message.ts";

interface ResponseData {
	auth_token: string;
}

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp } = context.req.valid("json");

		const savedOtp = await getSavedOtp(email);

		if (!savedOtp) {
			throw new APIError(undefined, "food.auth.login.OTP_EXPIRED", undefined, 400);
		}

		if (savedOtp.otp !== otp) {
			throw new APIError(undefined, "food.auth.login.OTP_INVALID", undefined, 400);
		}

		await deleteSavedOtp(email);

		const admin = await getUniqueAdmin({
			email,
		});

		if (!admin) {
			throw new APIError(undefined, "admin.auth.ACCOUNT_NOT_FOUND", undefined, 404);
		}

		if (admin.user.status === "suspended") {
			throw new APIError(undefined, "admin.auth.UNAUTHORIZED", undefined, 403);
		}

		if (admin.user.status === "unassigned") {
			await updateAdmin({
				email,
				data: {
					status: "active",
				},
			});
		}

		const token = JWT.signAuthToken({
			id: admin.user.id,
			role: admin.type,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("admin.auth.login.SUCCESS"),
			data: {
				auth_token: token,
			},
		};

		return context.json(response as any, response.code as any);
	},
);

