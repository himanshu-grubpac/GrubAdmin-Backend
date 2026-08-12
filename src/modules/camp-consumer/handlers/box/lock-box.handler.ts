import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	resolveConsumerBoxById,
	resolveConsumerClientId,
} from "@/db/actions/camp-consumer/box.actions.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { boxIdParamValidator } from "@/modules/camp-consumer/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { vertical_camping_consumer } from "@/db/types";

export const lockBoxHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id =
			context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const user = context.get("user") as vertical_camping_consumer;
		const consumerEmail = user.email?.trim() ?? "";
		const consumerName = user.full_name?.trim() || consumerEmail || "Consumer";
		const { box_id } = context.req.valid("param");

		const { box } = await resolveConsumerBoxById({
			box_id,
			client_id,
			consumer_id: user_id,
		});

		await updateBoxLockStatus({
			ids: [box.id],
			lock_status: "locked",
			user: {
				id: user_id,
				email: consumerEmail,
				name: consumerName,
			},
			client_id: client_id ?? box.client_id!,
		});

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
				metadata: { action: "lock" },
			});
		} catch {
			// Do not block response for logging failure
		}

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: "Box locked successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
