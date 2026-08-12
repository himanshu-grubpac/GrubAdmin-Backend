import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { boxIdParamValidator, cameraLiveQueryValidator } from "@/modules/camp-consumer/validators/box.validators.ts";
import {
	getConsumerCameraLive,
} from "@/db/actions/camp-consumer/camera.actions.ts";
import {
	resolveConsumerClientId,
} from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingCameraLiveData } from "@/types/camping-mobile/camera";

/**
 * GET /boxes/:box_id/camera/live?cam=1-4
 */
export const getLiveCameraHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	cameraLiveQueryValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");
		const { cam } = context.req.valid("query");

		const data = await getConsumerCameraLive({
			box_id,
			consumer_id: user_id,
			client_id,
			cam,
		});

		return context.json<APIResponse<CampingCameraLiveData>>({
			success: true,
			code: 200,
			data,
		});
	},
);
