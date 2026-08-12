import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	boxIdParamValidator,
	cameraUploadUrlBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import { createConsumerCameraUploadUrl } from "@/db/actions/camp-consumer/camera.actions.ts";
import { resolveConsumerClientId } from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingCameraUploadUrlData } from "@/types/camping-mobile/camera";

/**
 * POST /boxes/:box_id/camera/upload-url
 * Presigned PUT URL for box/device camera ingest (live HLS, recording, thumbnail).
 */
export const createUploadUrlHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	cameraUploadUrlBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");
		const body = context.req.valid("json");

		const data = await createConsumerCameraUploadUrl({
			box_id,
			consumer_id: user_id,
			client_id,
			kind: body.kind,
			cam_id: body.cam_id,
			feed_id: body.feed_id,
			filename: body.filename,
		});

		return context.json<APIResponse<CampingCameraUploadUrlData>>({
			success: true,
			code: 200,
			data,
		});
	},
);
