import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getGrubpacDetailsRequestQueryValidator } from "delivery/validators/box.validators.ts";
import { getVerticalDeliveryGrubpacEditDetails } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const getGrubpacEditDetailsHandler = createHandlers(
	deliveryAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("query");

		const data = await getVerticalDeliveryGrubpacEditDetails({ id, client_id });

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
			message: "Edit details fetched successfully",
			data,
		};

		return context.json<APIResponse<typeof data>>(response as any, response.code as any);
	},
);
