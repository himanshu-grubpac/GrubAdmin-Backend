import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyOtpRequestBodyValidator } from "camping/validators/auth.validators.ts";
import {
	deleteSavedCampingOtp,
	getSavedCampingOtp,
	compareOtp,
} from "@/db/actions/camping-otp.actions.ts";
import { CampingEmployeeOtp } from "@/db/mongo-schema/camping-employee-otp.model.ts";
import { APIError } from "@/types/error";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { loggerService } from "@/services/system-log.ts";
import { getCookie } from "hono/cookie";
import { prisma } from "@/db";

interface ResponseData {
	auth_token: string;
	otp_for_what: string;
	is_password_set: boolean;
}

export const verifyOtpHandler = createHandlers(
	verifyOtpRequestBodyValidator,
	async (context) => {
		const { email, otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const savedOtp = await getSavedCampingOtp(email, target_otp_id);

		if (!savedOtp) {
			throw new APIError(undefined, "camping.auth.login.OTP_EXPIRED");
		}

		const isMatch = await compareOtp(otp, savedOtp.otp);

		if (!isMatch || savedOtp.for_what !== "login") {
			const attempts = (savedOtp.failed_attempts ?? 0) + 1;
			if (attempts >= 3) {
				await deleteSavedCampingOtp(email);
				throw new APIError(undefined, "camping.auth.login.OTP_EXPIRED");
			} else {
				await CampingEmployeeOtp.updateOne({ _id: savedOtp._id }, { failed_attempts: attempts });
				throw new APIError(undefined, "camping.auth.login.OTP_INVALID");
			}
		}

		const for_what = savedOtp.for_what;

		await deleteSavedCampingOtp(email);

		const clientRecord = await prisma.client.findFirst({
			where: { email },
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "camping.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== "Camping") {
			throw new APIError(undefined, "camping.auth.login.UNAUTHORIZED");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "camping.auth.login.SUSPENDED");
		}

		const token = JWT.signCampingAuthToken({
			id: clientRecord.id,
			role: "admin",
		});

		await loggerService.log({
			category: "Profile",
			type: "Access",
			actor: {
				id: clientRecord.id,
				name: clientRecord.name || "",
				role: "admin",
				table: "client",
			},
			client_id: clientRecord.id,
			subject: {
				id: clientRecord.id,
				name: clientRecord.name || "",
				type: "employee",
			},
			metadata: {
				action: "login",
				via: "otp",
			},
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				client_id: clientRecord.id,
				data: {
					auth_token: token,
					otp_for_what: for_what,
					is_password_set: !!clientRecord.password,
				},
			},
			{
				status: 200,
			},
		);
	},
);
