import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { transferOwnershipRequestBodyValidator } from "hospitality/validators/account.validators.ts";
import { APIError } from "@/types/error";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { Otp as OtpUtil } from "@/utils/otp";
import { createHospitalityTransferOwnershipOtp, deleteHospitalityTransferOwnershipOtp } from "@/db/actions/hospitality-transfer-ownership-otp.actions";
import { ulid } from "ulid";
import { services } from "@/services";
import { Bcrypt } from "@/utils/bcrypt.ts";
import type { client } from "@/db/types";
import { getHospitalityMailFrom, isHospitalityOtpDevLogEnabled, logHospitalityOtpDev } from "hospitality/handlers/auth/auth.utils";
import { logHospitality } from "hospitality/utils/hospitality-logger";
import { queueHospitalityMail } from "hospitality/utils/hospitality-mail-queue";

export const transferOwnershipHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
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

		const ownerEmail = user.email;

		if (email.trim().toLowerCase() === ownerEmail.trim().toLowerCase()) {
			throw new APIError(
				"You cannot transfer ownership of your Grubpacs to your own account.",
				undefined,
				undefined,
				400,
			);
		}

		const uniqueIds = ids ? [...new Set(ids)] : [];

		if (transfer_mode === "selected") {
			if (uniqueIds.length === 0) {
				throw new APIError("Please select at least one Grubpac to transfer", undefined, undefined, 400);
			}

			const boxes = await prisma.box.findMany({
				where: { id: { in: uniqueIds }, client_id },
				select: { id: true },
			});

			if (boxes.length !== uniqueIds.length) {
				throw new APIError("Some selected Grubpacs are invalid or do not belong to you", undefined, undefined, 400);
			}
		}

		const otp = OtpUtil.generateOtp(4);
		const hashedOtp = await Bcrypt.generateHash({ data: otp });
		const otp_id = ulid();

		await deleteHospitalityTransferOwnershipOtp(user_id);

		await createHospitalityTransferOwnershipOtp({
			user_id,
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

		if (isHospitalityOtpDevLogEnabled()) {
			logHospitalityOtpDev({
				email: ownerEmail,
				otp,
				otp_id,
				for_what: "transfer-ownership",
			});
		}
		queueHospitalityMail({
			label: "transfer-ownership",
			send: () =>
				services.mailer.sendEmail({
					to: ownerEmail,
					from: getHospitalityMailFrom(),
					subject: "Grubpac Ownership Transfer OTP",
					html: `<p>Your OTP for ownership transfer is: <b>${otp}</b>. Valid for 10 minutes.</p>`,
				}),
			onFailure: async () => {
				logHospitality(context, "error", "hospitality_transfer_ownership_mail_failed", {
					client_id,
					otp_id,
				});
			},
		});

		try {
			await loggerService.log({
				category: "Profile",
				type: "Ownership",
				actor: {
					id: user.id,
					name: (user as client).name || "Admin",
					role: "admin",
					table: "client",
				},
				client_id,
				subject: { id: user.id, name: user.email || "Unknown", type: "account" },
				metadata: {
					transfer_mode,
					box_count: transfer_mode === "all" ? "all" : uniqueIds.length,
					recipient_email: email,
				},
			});
		} catch {
			// non-fatal
		}

		return context.json<APIResponse<{ otp_id: string; otp?: string }>>(
			{
				success: true,
				code: 200,
				data: {
					otp_id,
					...(isHospitalityOtpDevLogEnabled() ? { otp } : {}),
				},
			},
			{ status: 200 },
		);
	},
);
