import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { feedIdParamValidator } from "@/modules/camp-consumer/validators/box.validators.ts";
import { getConsumerCameraStream } from "@/db/actions/camp-consumer/camera.actions.ts";
import { resolveConsumerClientId } from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingCameraStreamData } from "@/types/camping-mobile/camera";

export const getStreamHandler = createHandlers(
	campingAuthGuard(),
	feedIdParamValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id, feed_id } = context.req.valid("param");

		const data = await getConsumerCameraStream({
			box_id,
			feed_id,
			consumer_id: user_id,
			client_id,
		});

		return context.json<APIResponse<CampingCameraStreamData>>({
			success: true,
			code: 200,
			data,
		});
	},
);
