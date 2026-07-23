import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getVerticalDeliveryBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { getMyGrubpacsRequestQueryValidator } from "delivery/validators/account.validators.ts";

export const getMyGrubpacsHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	getMyGrubpacsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { power_status, query } = context.req.valid("query") as any;

		// Reuse the canonical grubpac reader so each box carries flattened
		// telemetry (power_status etc.) and permission rows, which the transfer
		// ownership screen relies on. The previous raw prisma query returned bare
		// box rows without telemetry/permissions.
		const { boxes, count } = await getVerticalDeliveryBoxes({
			client_id,
			power_status,
			query,
			fetchAll: true,
		});

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				data: {
					boxes,
					count,
				},
			},
			{
				status: 200,
			},
		);
	},
);

