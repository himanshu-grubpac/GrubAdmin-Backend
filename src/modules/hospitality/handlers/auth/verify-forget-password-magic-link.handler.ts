import { createHandlers } from "@/utils/hono-factory.ts";
import { verifyForgetPasswordMagicLinkRequestBodyValidator } from "hospitality/validators/auth.validators.ts";
import { APIError } from "@/types/error";
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
	compareOtp,
	getForgetPasswordOtpByLinkId,
	saveOtp,
} from "@/db/actions/otp.actions.ts";
import crypto from "crypto";

interface VerifyForgetPasswordResponse {
	link_id: string;
	email: string;
	token: string;
}

export const verifyForgetPasswordMagicLinkHandler = createHandlers(
	verifyForgetPasswordMagicLinkRequestBodyValidator,
	async (context) => {
		const body = context.req.valid("json");
		const link_id = body.link_id?.trim();
		const emailInput = body.email ? normalizeAuthEmail(body.email) : "";
		const tokenInput = body.token?.trim() || "";

		let savedToken = null;
		let normalizedEmail = emailInput;
		let responseToken = tokenInput;

		if (link_id) {
			savedToken = await getForgetPasswordOtpByLinkId(link_id);
			if (!savedToken) {
				throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_EXPIRED");
			}

			normalizedEmail = normalizeAuthEmail(savedToken.email);
			responseToken = crypto.randomBytes(32).toString("hex");

			savedToken = await saveOtp({
				otp_id: savedToken.otp_id,
				email: normalizedEmail,
				otp: responseToken,
				role: (savedToken.role as "admin") || "admin",
				for_what: "forget_password",
			});

			if (!savedToken) {
				throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_EXPIRED");
			}
		} else {
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
			const activeTokens = await OtpModel.find({
				email: normalizedEmail,
				for_what: "forget_password",
			});

			for (const activeToken of activeTokens) {
				if (await compareOtp(tokenInput, activeToken.otp)) {
					savedToken = activeToken;
					break;
				}
			}

			if (!savedToken) {
				await incrementOtpAttempt(lockKey);
				throw new APIError(undefined, "hospitality.auth.login.MAGIC_LINK_EXPIRED");
			}
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

		await resetOtpAttempt(lockKey);

		return context.json<APIResponse<VerifyForgetPasswordResponse>>(
			{
				success: true,
				code: 200,
				data: {
					link_id: savedToken.otp_id,
					email: normalizedEmail,
					token: responseToken,
				},
			},
			{ status: 200 },
		);
	},
);
