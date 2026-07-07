import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { lockOtpRequestBodyValidator } from "camping/validators/box.validators";
import { prisma } from "@/db";
import { saveCampingOtp } from "@/db/actions/camping-otp.actions";
import { Otp } from "@/utils/otp";
import { services } from "@/services";
import { loggerService } from "@/services/system-log";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const requestLockOtpHandler = createHandlers(
	campingAuthGuard(),
	lockOtpRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const user_id = context.get("user_id");
		const vertical_id = context.get("vertical_id");
		const user = context.get("user") as { email?: string; name?: string };
		const clientEmail = user.email?.trim() ?? "";
		const box_id = context.req.param("box_id");
		const { action } = context.req.valid("json");

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

		const otp = Otp.generateOtp(4);

		const updatedOtpRecord = await saveCampingOtp({
			email: clientEmail,
			otp,
			role: "admin",
			for_what: "unlock_box",
			metadata: {
				box_id: box.id,
				box_display_id: box.box_display_id,
				action,
			},
		});

		if (!updatedOtpRecord) {
			return context.json<APIResponse<null>>(
				{
					success: false,
					code: 500,
					error: "Failed to generate OTP",
				},
				{ status: 500 },
			);
		}

		const actionLabel = action === "unlock" ? "unlock" : "lock";
		await services.mailer.sendEmail({
			from: "ankan@sqaby.com",
			subject: `Camping Portal - GrubLock ${actionLabel} OTP`,
			to: clientEmail,
			text: `Your OTP to ${actionLabel} GrubLock on ${box.box_display_id} is ${otp} (OTP Session ID: ${updatedOtpRecord.otp_id})`,
		});

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "Status",
				actor: {
					id: user_id,
					name: user.name || clientEmail || "Camping Client",
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

		const message = action === "unlock" ? "Unlock OTP sent successfully" : "Lock OTP sent successfully";

		const responseData = {
			otp_id: updatedOtpRecord.otp_id,
			otp_details: {
				type: "email",
				values: [clientEmail],
			},
		};

		return context.json<APIResponse<typeof responseData>>({
			success: true,
			code: 200,
			message,
			data: responseData,
		});
	},
);
