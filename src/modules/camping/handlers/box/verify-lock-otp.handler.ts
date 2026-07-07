import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { lockVerifyRequestBodyValidator } from "camping/validators/box.validators";
import { prisma } from "@/db";
import { CampingEmployeeOtp } from "@/db/mongo-schema";
import {
	compareOtp,
	deleteSavedCampingOtp,
	getSavedCampingOtp,
} from "@/db/actions/camping-otp.actions";
import { updateBoxLockStatus } from "@/db/actions/box.actions";
import { loggerService } from "@/services/system-log";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

const MAX_LOCK_OTP_ATTEMPTS = 3;

export const verifyLockOtpHandler = createHandlers(
	campingAuthGuard(),
	lockVerifyRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const user_id = context.get("user_id");
		const vertical_id = context.get("vertical_id");
		const user = context.get("user") as { email?: string; name?: string };
		const clientEmail = user.email?.trim() ?? "";
		const clientName = user.name || clientEmail || "Camping Client";
		const box_id = context.req.param("box_id");
		const { otp, otp_id } = context.req.valid("json");

		const box = await prisma.box.findFirst({
			where: {
				id: box_id,
				client_id,
				status: { not: "suspended" },
			},
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		if (!clientEmail) {
			throw new APIError(undefined, "camping.auth.login.EMAIL_NOT_FOUND");
		}

		const savedOtp = await getSavedCampingOtp(clientEmail, otp_id);

		if (!savedOtp) {
			throw new APIError("OTP expired or invalid", undefined, undefined, 400);
		}

		if (savedOtp.for_what !== "unlock_box") {
			throw new APIError("Invalid OTP purpose", undefined, undefined, 400);
		}

		const metadata = savedOtp.metadata as {
			box_id?: string;
			action?: "lock" | "unlock";
		} | null;

		if (metadata?.box_id !== box.id) {
			throw new APIError("Invalid OTP session for this box", undefined, undefined, 403);
		}

		const action = metadata?.action || "unlock";

		const isValidOtp = await compareOtp(otp, savedOtp.otp);

		if (!isValidOtp) {
			const attempts = (savedOtp.failed_attempts ?? 0) + 1;

			if (attempts >= MAX_LOCK_OTP_ATTEMPTS) {
				await deleteSavedCampingOtp(clientEmail);
				throw new APIError("OTP expired or invalid", undefined, undefined, 400);
			}

			await CampingEmployeeOtp.updateOne(
				{ _id: savedOtp._id },
				{ failed_attempts: attempts },
			);

			throw new APIError("Invalid OTP", undefined, undefined, 400);
		}

		const lockStatus = action === "unlock" ? "unlocked" : "locked";

		await updateBoxLockStatus({
			ids: [box.id],
			lock_status: lockStatus,
			user: {
				id: user_id,
				email: clientEmail,
				name: clientName,
			},
			client_id,
		});

		await deleteSavedCampingOtp(clientEmail);

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "OTP",
				actor: {
					id: user_id,
					name: clientName,
					role: "admin",
					table: "client",
				},
				client_id,
				vertical_id,
				subject: { id: box.id, name: box.box_display_id, type: "box" },
				metadata: { action },
			});
		} catch {
			// Logging failure shouldn't block response
		}

		const message = action === "unlock" ? "Grublock unlocked successfully" : "Grublock locked successfully";

		return context.json<APIResponse<null>>({
			success: true,
			code: 200,
			message,
			data: null,
		});
	},
);
