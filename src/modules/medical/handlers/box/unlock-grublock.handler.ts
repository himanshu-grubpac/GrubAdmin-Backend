import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { unlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { saveMedicalEmployeeOtp } from "@/db/actions/otp.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import { loggerService } from "@/services/system-log.ts";
import type { APIResponse } from "@/types/api";

export const unlockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager", "handler"]),
	unlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type, vertical_id } = context.var;
		const { ids, consumer_full_name, consumer_country_code, consumer_phone } =
			context.req.valid("json");

		const userObj = user as any;
		const userName = type === "admin"
			? (userObj.name as string)
			: `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();

		const otp = process.env.NODE_ENV === "production"
			? String(Math.floor(1000 + Math.random() * 9000))
			: "2026";

		const result = await saveMedicalEmployeeOtp({
			email: userObj.email,
			otp,
			for_what: "unlock_box",
			metadata: {
				ids,
				requested_by: user_id,
				client_id,
			},
		});

		// Create notification for each unlock request
		try {
			for (const boxId of ids) {
				await createNotification({
					client_id,
					vertical_id,
					box_id: boxId,
					type: "notification",
					title: "Unlock Requested",
					description: `Unlock OTP requested for box ${boxId}. OTP sent to registered email.`,
				});
			}
		} catch (err) {
			console.error("Failed to create unlock request notification:", err);
		}

		// Start auto-injected log
		try {
			const subjects = (context.req.valid("json") as any)?.ids || [];
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubLock",
					type: "Status",
					actor: {
						id: client_id || "Unknown",
						name: userName || "Admin",
						role: type,
						table: "client",
					},
					client_id,
					subject: { id, name: id, type: "box" },
					metadata: { action: "unlock_request" },
				});
			}
		} catch (err) {}
		// End auto-injected log

		return context.json<APIResponse<{ otp_id: string }>>(
			{
				success: true,
				code: 200,
				data: { otp_id: result.id },
				message: "OTP sent to mobile successfully",
			},
			{ status: 200 },
		);
	},
);
