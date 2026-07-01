import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { unlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { saveMedicalEmployeeOtp } from "@/db/actions/medical-otp.actions.ts";
import type { APIResponse } from "@/types/api";
import { Otp } from "@/utils/otp.ts";

export const unlockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager", "handler"]),
	unlockGrublockRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;
		const { ids, consumer_full_name, consumer_country_code, consumer_phone } = context.req.valid("json");

		const userObj = user as any;
		const otp = process.env.NODE_ENV === "production" ? Otp.generateOtp(4) : "2026";

		const updatedOtpRecord = await saveMedicalEmployeeOtp({
			email: userObj.email as string,
			otp,
			role: type,
			for_what: "unlock_box",
			metadata: {
				ids,
				consumer: consumer_full_name
					? {
						full_name: consumer_full_name,
						country_code: consumer_country_code || "",
						phone: consumer_phone || "",
					}
					: undefined,
			},
		});

		if (!updatedOtpRecord) {
			return context.json<APIResponse<null>>(
				{ success: false, code: 500, error: "Failed to generate OTP" },
				{ status: 500 },
			);
		}

		try {
			for (const id of ids) {
				await loggerService.log({
					category: "GrubLock",
					type: "Status",
					actor: { id: userObj.id as string, name: userObj.email || "Unknown", role: type, table: "vertical_medical_employee" },
					client_id: context.var.client_id,
					subject: { id, name: id, type: "box" },
					metadata: { action: "unlock" },
				});
			}
		} catch {
			// non-fatal
		}

		return context.json<APIResponse<{ otp_id: string; is_otp: boolean; otp_details: { type: string; values: string[] } }>>(
			{
				success: true,
				code: 200,
				message: "OTP sent to mobile successfully",
				data: {
					otp_id: updatedOtpRecord.otp_id,
					is_otp: true,
					otp_details: { type: "email", values: [userObj.email as string] },
				},
			},
			{ status: 200 },
		);
	},
);
