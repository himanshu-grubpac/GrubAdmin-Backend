import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { searchGrublockRequestQueryValidator } from "delivery/validators/box.validators.ts";
import { searchVerticalDeliveryBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { box_status } from "@/db/types";

export const searchGrublockHandler = createHandlers(
	deliveryAuthGuard(["admin", "manager"]),
	searchGrublockRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const boxes = await searchVerticalDeliveryBoxes({
			query,
			limit,
			status: status as box_status,
			client_id,
		});

		return context.json<APIResponse<typeof boxes>>(
			{
				success: true,
				code: 200,
				message: "Grublock search results fetched successfully",
				data: boxes,
			},
			{
				status: 200,
			},
		);
	},
);

