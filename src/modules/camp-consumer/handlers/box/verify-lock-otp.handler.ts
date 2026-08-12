import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	resolveConsumerClientId,
	verifyConsumerLockOtp,
} from "@/db/actions/camp-consumer/box.actions.ts";
import {
	boxIdParamValidator,
	verifyLockOtpBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { vertical_camping_consumer } from "@/db/types";

export const verifyLockOtpHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	verifyLockOtpBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id =
			context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const user = context.get("user") as vertical_camping_consumer;
		const { box_id } = context.req.valid("param");
		const { code, action } = context.req.valid("json");

		const consumerName = user.full_name?.trim() || user.email || "Consumer";

		await verifyConsumerLockOtp({
			box_id,
			client_id,
			consumer_id: user_id,
			consumer_email: user.email,
			consumer_name: consumerName,
			code,
			action,
		});

		try {
			await loggerService.log({
				category: "GrubLock",
				type: "OTP",
				actor: {
					id: user_id,
					name: consumerName,
					role: "consumer",
					table: "vertical_camping_consumer",
				},
				client_id: client_id ?? undefined,
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
