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
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";

const DEV_LOCK_OTP = "1234";

interface LockOtpResponseData {
	otp?: string;
	otp_details: {
		type: string;
		values: string[];
	};
}

export const requestLockOtpHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	boxIdParamValidator,
	lockOtpBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as { email?: string };
		const employeeEmail = user.email?.trim() ?? "";
		const { box_id } = context.req.valid("param");
		const isProduction = process.env.NODE_ENV === "production";
		const action = "unlock" as const;

		const { box } = await resolveDriverBoxById({
			box_id,
			client_id,
			employee_id: user_id,
		});

		const otp = isProduction ? Otp.generateOtp(4) : DEV_LOCK_OTP;

		if (isProduction && !employeeEmail) {
			throw new APIError("No email found for this account!", undefined, undefined, 400);
		}

		const updatedOtpRecord = await saveDeliveryEmployeeOtp({
			email: employeeEmail,
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

		if (isProduction) {
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "Delivery Mobile - GrubLock unlock OTP",
				to: employeeEmail,
				text: `Your OTP to unlock GrubLock on ${box.box_display_id} is ${otp}`,
			});
		}

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "Status",
				actor: {
					id: user_id,
					name: employeeEmail || "Driver",
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

		const message = "Unlock OTP sent successfully";

		const responseData: LockOtpResponseData = isProduction
			? {
					otp_details: {
						type: "email",
						values: [employeeEmail],
					},
				}
			: {
					otp: DEV_LOCK_OTP,
					otp_details: {
						type: "test",
						values: [DEV_LOCK_OTP],
					},
				};

		return context.json<APIResponse<LockOtpResponseData>>(
			{
				success: true,
				code: 200,
				message,
				data: responseData,
			},
			{ status: 200 },
		);
	},
);
