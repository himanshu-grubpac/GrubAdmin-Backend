import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { boxIdParamValidator, cameraFeedsQueryValidator } from "@/modules/camp-consumer/validators/box.validators.ts";
import { listConsumerCameraFeeds } from "@/db/actions/camp-consumer/camera.actions.ts";
import { resolveConsumerClientId } from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingCameraFeedsData } from "@/types/camping-mobile/camera";

export const listFeedsHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	cameraFeedsQueryValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");
		const { date, cam } = context.req.valid("query");

		const data = await listConsumerCameraFeeds({
			box_id,
			consumer_id: user_id,
			client_id,
			date,
			cam,
		});

		return context.json<APIResponse<CampingCameraFeedsData>>({
			success: true,
			code: 200,
			data,
		});
	},
);
