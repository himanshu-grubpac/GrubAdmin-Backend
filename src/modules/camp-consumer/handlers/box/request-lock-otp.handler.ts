import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	resolveConsumerBoxById,
	resolveConsumerClientId,
} from "@/db/actions/camp-consumer/box.actions.ts";
import { saveCampingConsumerOtp } from "@/db/actions/camping-consumer-otp.actions.ts";
import {
	boxIdParamValidator,
	lockOtpBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { vertical_camping_consumer } from "@/db/types";

const DEV_LOCK_OTP = "1234";

interface LockOtpResponseData {
	otp?: string;
	otp_details: {
		type: string;
		values: string[];
	};
}

export const requestLockOtpHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	lockOtpBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id =
			context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const user = context.get("user") as vertical_camping_consumer;
		const consumerEmail = user.email?.trim() ?? "";
		const { box_id } = context.req.valid("param");
		const { action } = context.req.valid("json");
		const isProduction = process.env.NODE_ENV === "production";

		const { box } = await resolveConsumerBoxById({
			box_id,
			client_id,
			consumer_id: user_id,
		});

		const otp = isProduction ? Otp.generateOtp(4) : DEV_LOCK_OTP;

		if (isProduction && !consumerEmail) {
			throw new APIError("No email found for this account!", undefined, undefined, 400);
		}

		const updatedOtpRecord = await saveCampingConsumerOtp({
			email: consumerEmail,
			otp,
			for_what: "unlock_box",
			metadata: {
				ids: [box.id],
				box_display_id: box.box_display_id,
				action,
			},
		});

		if (!updatedOtpRecord) {
			return context.json<APIResponse<null>>(
				{ success: false, code: 500, error: "Failed to generate OTP" },
				{ status: 500 },
			);
		}

		if (isProduction) {
			await services.mailer.sendEmail({
				from: "ankan@sqaby.com",
				subject: "Camp Consumer - GrubLock unlock OTP",
				to: consumerEmail,
				text: `Your OTP to unlock GrubLock on ${box.box_display_id} is ${otp}`,
			});
		}

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "Status",
				actor: {
					id: user_id,
					name: consumerEmail || "Consumer",
					role: "consumer",
					table: "vertical_camping_consumer",
				},
				client_id: client_id ?? box.client_id ?? undefined,
				subject: { id: box.id, name: box.box_display_id, type: "box" },
				metadata: { action },
			});
		} catch {
			// logging must not block OTP response
		}

		const responseData: LockOtpResponseData = isProduction
			? {
					otp_details: {
						type: "email",
						values: [consumerEmail],
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
				message: "Unlock OTP sent successfully",
				data: responseData,
			},
			{ status: 200 },
		);
	},
);
