import { createHandlers } from "@/utils/hono-factory.ts";
import { resetPasswordMagicLinkRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { deleteSavedOtp } from "@/db/actions/otp.actions.ts";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import {
	isOtpAttemptLocked,
	incrementOtpAttempt,
	resetOtpAttempt,
	getOtpLockoutRemaining,
} from "@/db/actions/hospitality-otp-attempt.actions";
import {
	assertHospitalityClientHasEmail,
	buildHospitalityClientLookupWhere,
	normalizeAuthEmail,
} from "./auth.utils";
import { getHospitalityLoginOtpLockKey } from "./hospitality-otp-lockout";
import {
	signHospitalitySessionToken,
} from "./hospitality-auth-token";
import { setHospitalityAuthCookie } from "hospitality/utils/hospitality-auth-cookie";

interface ResponseData {
	link_id: string;
}

export const resetPasswordMagicLinkHandler = createHandlers(
	resetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const { email, token, password } = context.req.valid("json");
		const normalizedEmail = normalizeAuthEmail(email);
		if (!normalizedEmail) {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_NOT_FOUND");
		}
		const lockKey = getHospitalityLoginOtpLockKey(normalizedEmail);

		if (await isOtpAttemptLocked(lockKey)) {
			const remainingMinutes = await getOtpLockoutRemaining(lockKey);
			throw new APIError(
				`Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
				undefined,
				undefined,
				429,
			);
		}

		const { Otp: OtpModel } = await import("@/db/mongo-schema/otp.model.ts");
		const activeTokens = await OtpModel.find({ email: normalizedEmail, for_what: "forget_password" });

		let savedToken = null;
		const { compareOtp } = await import("@/db/actions/otp.actions.ts");
		for (const activeToken of activeTokens) {
			if (await compareOtp(token, activeToken.otp)) {
				savedToken = activeToken;
				break;
			}
		}

		if (!savedToken) {
			await incrementOtpAttempt(lockKey);
			throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_EXPIRED");
		}

		const clientRecord = await prisma.client.findFirst({
			where: buildHospitalityClientLookupWhere(normalizedEmail),
			include: { vertical: true },
		});

		if (!clientRecord || !assertHospitalityClientHasEmail(clientRecord)) {
			throw new APIError(undefined, "hospitality.auth.login.EMAIL_NOT_FOUND");
		}

		if (clientRecord.vertical?.name !== HOSPITALITY_VERTICAL_NAME) {
			throw new APIError(undefined, "hospitality.auth.login.UNAUTHORIZED");
		}

		if (clientRecord.status === "suspended") {
			throw new APIError(undefined, "hospitality.auth.login.SUSPENDED");
		}

		if (clientRecord.status !== "active") {
			throw new APIError(undefined, "hospitality.auth.login.ACCOUNT_INACTIVE");
		}

		const hashedPassword = await Bcrypt.generateHash({
			data: password,
			saltLength: 10,
		});

		const currentVersion = clientRecord.auth_token_version ?? 0;
		const updated = await prisma.client.updateMany({
			where: {
				id: clientRecord.id,
				auth_token_version: currentVersion,
				status: "active",
			},
			data: {
				password: hashedPassword,
				auth_token_version: { increment: 1 },
			},
		});

		if (updated.count === 0) {
			throw new APIError(
				"The auth token is either invalid or has expired!",
				undefined,
				undefined,
				401,
			);
		}

		await deleteSavedOtp(normalizedEmail);
		await resetOtpAttempt(lockKey);

		const sessionToken = await signHospitalitySessionToken(clientRecord.id, "admin");

		setHospitalityAuthCookie(context, sessionToken);

		const otp_id = savedToken.otp_id;

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					link_id: otp_id,
				},
			},
			{
				status: 200,
			},
		);
	},
);
