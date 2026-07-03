import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordMagicLinkRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { deleteSavedOtp } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { JWT } from "@/utils/jwt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";

interface ResponseData {
	auth_token: string;
}

export const resetPasswordMagicLinkHandler = createHandlers(
	resetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email, token, password } = context.req.valid("json");

		const { Otp: OtpModel } = await import("@/db/mongo-schema/otp.model.ts");
		const activeTokens = await OtpModel.find({ email: email.trim().toLowerCase(), for_what: "forget_password" });

		let savedToken = null;
		const { compareOtp } = await import("@/db/actions/otp.actions.ts");
		for (const activeToken of activeTokens) {
			if (await compareOtp(token, activeToken.otp)) {
				savedToken = activeToken;
				break;
			}
		}

		if (!savedToken) {
			throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_EXPIRED");
		}

		const clientRecord = await prisma.client.findFirst({
			where: { email },
			include: { vertical: true },
		});

		if (!clientRecord) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "hospitality.auth.login.SUSPENDED");
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		await prisma.client.update({
			where: {
				id: clientRecord.id,
			},
			data: {
				password: hashedPassword,
			},
		});

		await deleteSavedOtp(email);

		const auth_token = JWT.signHospitalityAuthToken({
			role: "admin",
			id: clientRecord.id,
		});

		const otp_id = savedToken.otp_id;

		return context.json<APIResponse<ResponseData & { link_id: string }>>(
			{
				success: true,
				code: 200,
				data: {
					auth_token,
					link_id: otp_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);
