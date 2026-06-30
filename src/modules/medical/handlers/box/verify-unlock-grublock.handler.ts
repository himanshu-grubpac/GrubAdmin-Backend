import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { verifyUnlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { getSavedMedicalEmployeeOtp, deleteSavedMedicalEmployeeOtp, compareOtp } from "@/db/actions/medical-otp.actions.ts";
import { updateMedicalBoxLockStatus } from "@/db/actions/medical/box.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const verifyUnlockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager", "handler"]),
	verifyUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type, vertical_id } = context.var;
		const { otp_id, otp } = context.req.valid("json");

		const userObj = user as any;
		const savedOtp = await getSavedMedicalEmployeeOtp(userObj.email as string, otp_id);

		if (!savedOtp) {
			throw new APIError("OTP expired or invalid", undefined, undefined, 400);
		}

		if (!(await compareOtp(otp, savedOtp.otp))) {
			throw new APIError("Invalid OTP", undefined, undefined, 400);
		}

		if (savedOtp.for_what !== "unlock_box") {
			throw new APIError("Invalid OTP purpose", undefined, undefined, 400);
		}

		const { ids, consumer } = (savedOtp.metadata || {}) as {
			ids?: string[];
			consumer?: { full_name: string; country_code: string; phone: string };
		};

		if (!ids || !Array.isArray(ids)) {
			throw new APIError("Invalid session metadata", undefined, undefined, 400);
		}

		const userName = type === "admin"
			? (userObj.name as string)
			: `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();

		const result = await updateMedicalBoxLockStatus({
			ids,
			lock_status: "unlocked",
			user: {
				id: user_id,
				email: userObj.email || "",
				name: userName || "Unknown",
				type,
				role: type,
				client_id,
				vertical_id,
			},
			client_id,
			consumer: consumer || undefined,
		});

		await deleteSavedMedicalEmployeeOtp(userObj.email as string);

		return context.json<APIResponse<typeof result>>(
			{ success: true, code: 200, message: "Boxes unlocked successfully", data: result },
			{ status: 200 },
		);
	},
);
