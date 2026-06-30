import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import {
	getMedicalEmployeeUpdateOtp,
	upsertMedicalEmployeeUpdateOtp,
} from "@/db/actions/medical-employee-update-otp.actions.ts";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { APIResponse } from "@/types/api";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { resendUpdateAccountOtpRequestBodyValidator } from "medical/validators/account.validators.ts";
import { getCookie, setCookie } from "hono/cookie";

export const updateAccountResendOtpHandler = createHandlers(
	medicalAuthGuard(),
	resendUpdateAccountOtpRequestBodyValidator,
	async (context) => {
		const { user } = context.var;
		const { otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;

		const oldEmployeeUpdateOtp = await getMedicalEmployeeUpdateOtp(user.id, target_otp_id);

		if (!oldEmployeeUpdateOtp) {
			throw new APIError(
				"No OTP for change request has been initiated yet.",
				undefined,
				undefined,
				400,
			);
		}

		const updatedAt = (oldEmployeeUpdateOtp as any).updatedAt || oldEmployeeUpdateOtp.createdAt;
		const secondsSinceLastSend = (Date.now() - new Date(updatedAt).getTime()) / 1000;
		if (secondsSinceLastSend < 60) {
			throw new APIError(
				`Please wait ${Math.ceil(60 - secondsSinceLastSend)} seconds before resending another OTP.`,
				"medical.auth.login.OTP_COOLDOWN",
				undefined,
				429,
			);
		}

		const otp = Otp.generateOtp(4);
		const hashedOtp = await Bcrypt.generateHash({ data: otp });

		const updatedOtpRecord = await upsertMedicalEmployeeUpdateOtp({
			otp_id: oldEmployeeUpdateOtp.otp_id,
			user_id: user.id,
			otp: hashedOtp,
			email: oldEmployeeUpdateOtp.email ?? undefined,
			role: oldEmployeeUpdateOtp.role,
		});

		if (!updatedOtpRecord) {
			throw new APIError("Failed to update OTP", undefined, undefined, 500);
		}

		const otp_id = updatedOtpRecord.otp_id;

		setCookie(context, "otp_id", otp_id, {
			path: "/",
			httpOnly: true,
			maxAge: 60 * 5,
			sameSite: "Lax",
		});

		let otpSendFailed = false;
		if (process.env.NODE_ENV !== "production") {
			console.log(`\n🔑 [DEV ONLY] Resent Account Update OTP: ${otp} (Session ID: ${otp_id})\n`);
		}
		try {
			await services.mailer.sendEmail({
				from: process.env.MAIL || "ankan@sqaby.com",
				subject: "OTP for Account Update",
				to: oldEmployeeUpdateOtp.email || user.email || "",
				text: `Your OTP to update your medical employee account is ${otp} (OTP Session ID: ${otp_id})`,
			});
		} catch {
			otpSendFailed = true;
		}

		const message_debug = otpSendFailed
			? "A new verification OTP has been generated. However, the OTP delivery failed."
			: "A new verification OTP has been generated, and the OTP has been successfully delivered.";

		return context.json<
			APIResponse<{ otp_id: string; otp_details: { type: string; values: string[] } }> & {
				is_otp: boolean;
				has_changed: boolean;
				message_debug: string;
			}
		>({
			success: true,
			code: 200,
			is_otp: true,
			has_changed: true,
			message_debug,
			data: {
				otp_id,
				otp_details: {
					type: "email",
					values: [oldEmployeeUpdateOtp.email!],
				},
			},
		});
	},
);
