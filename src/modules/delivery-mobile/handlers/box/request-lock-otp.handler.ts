import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { resolveDriverBoxById } from "@/db/actions/delivery-mobile/box.actions.ts";
import { saveDeliveryEmployeeOtp } from "@/db/actions/delivery-employee-otp.actions.ts";
import {
	boxIdParamValidator,
	lockOtpBodyValidator,
} from "@/modules/delivery-mobile/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import { Otp } from "@/utils/otp.ts";

export const requestLockOtpHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	lockOtpBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as { email?: string };
		const { box_id } = context.req.valid("param");
		const { action } = context.req.valid("json");

		const { box } = await resolveDriverBoxById({
			box_id,
			client_id,
			employee_id: user_id,
		});

		const otp =
			process.env.NODE_ENV === "production" ? Otp.generateOtp(4) : "1111";

		const updatedOtpRecord = await saveDeliveryEmployeeOtp({
			email: user.email ?? "",
			otp,
			role: "delivery",
			for_what: "unlock_box",
			metadata: {
				ids: [box.id],
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

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "Status",
				actor: {
					id: user_id,
					name: user.email ?? "Driver",
					role: "delivery",
					table: "vertical_delivery_employee",
				},
				client_id,
				subject: { id: box.id, name: box.box_display_id, type: "box" },
				metadata: { action },
			});
		} catch {
			// logging must not block OTP response
		}

		const message =
			action === "unlock"
				? "Unlock OTP sent successfully"
				: "Lock OTP sent successfully";

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message,
				data: null,
			},
			{ status: 200 },
		);
	},
);
