import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import {
	boxIdParamValidator,
	surveillanceModeBodyValidator,
} from "@/modules/camp-consumer/validators/box.validators.ts";
import { patchConsumerSurveillanceMode } from "@/db/actions/camp-consumer/camera.actions.ts";
import { resolveConsumerClientId } from "@/db/actions/camp-consumer/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingSurveillanceModeData } from "@/types/camping-mobile/camera";

export const patchSurveillanceModeHandler = createHandlers(
	campingAuthGuard(),
	boxIdParamValidator,
	surveillanceModeBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id") ?? (await resolveConsumerClientId(user_id));
		const { box_id } = context.req.valid("param");
		const { enabled } = context.req.valid("json");

		const data = await patchConsumerSurveillanceMode({
			box_id,
			consumer_id: user_id,
			client_id,
			enabled,
		});

		return context.json<APIResponse<CampingSurveillanceModeData>>({
			success: true,
			code: 200,
			message: "Surveillance mode updated",
			data,
		});
	},
);
