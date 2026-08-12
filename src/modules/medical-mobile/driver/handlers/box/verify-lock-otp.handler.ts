import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { verifyHandlerLockOtp } from "@/db/actions/medical-mobile/box.actions.ts";
import {
	boxIdParamValidator,
	verifyLockOtpBodyValidator,
} from "@/modules/medical-mobile/driver/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

/**
 * POST /boxes/:box_id/lock/verify
 * Request: { "code": "1234", "action": "unlock" }
 * Response: { "message": "Grublock unlocked successfully", "data": null }
 */
export const verifyLockOtpHandler = createHandlers(
	medicalMobileAuthGuard(["handler"], "driver"),
	boxIdParamValidator,
	verifyLockOtpBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as {
			email?: string;
			first_name?: string;
			last_name?: string | null;
		};
		const { box_id } = context.req.valid("param");
		const { code, action } = context.req.valid("json");

		const employeeName =
			`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Handler";

		await verifyHandlerLockOtp({
			box_id,
			client_id,
			employee_id: user_id,
			employee_email: user.email ?? "",
			employee_name: employeeName,
			code,
			action,
		});

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "OTP",
				actor: {
					id: user_id,
					name: employeeName,
					role: "handler",
					table: "vertical_medical_employee",
				},
				client_id,
				subject: { id: box_id, name: box_id, type: "box" },
				metadata: { action },
			});
		} catch {
			// logging must not block verify response
		}

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: "Grublock unlocked successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
