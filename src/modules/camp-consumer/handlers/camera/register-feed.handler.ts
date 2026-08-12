import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	boxIdParamValidator,
	cameraFeedRegisterBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import { registerConsumerCameraFeed } from "@/db/actions/camp-consumer/camera.actions.ts";
import { resolveConsumerClientId } from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingCameraFeedRegisterData } from "@/types/camping-mobile/camera";

/**
 * POST /boxes/:box_id/camera/feeds/register
 * Register a completed recording after S3 upload (creates camp_camera_feed row).
 */
export const registerFeedHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	cameraFeedRegisterBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");
		const body = context.req.valid("json");

		const data = await registerConsumerCameraFeed({
			box_id,
			consumer_id: user_id,
			client_id,
			cam_id: body.cam_id,
			s3_key: body.s3_key,
			thumbnail_key: body.thumbnail_key,
			recorded_at: body.recorded_at,
			duration_sec: body.duration_sec,
		});

		return context.json<APIResponse<CampingCameraFeedRegisterData>>(
			{
				success: true,
				code: 201,
				data,
			},
			201,
		);
	},
);
