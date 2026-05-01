import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { searchBoxesRequestQueryValidator } from "food/validators/box.validators.ts";
import { searchVerticalFoodBoxes } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import type { box_status } from "@/db/types";

export const searchGrubpacHandler = createHandlers(
	foodAuthGuard(["admin", "manager"]),
	searchBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const boxes = await searchVerticalFoodBoxes({
			query: query || "",
			limit,
			status: status as box_status,
			client_id,
		});

		return context.json<APIResponse<typeof boxes>>(
			{
				success: true,
				code: 200,
				message: "Boxes search results fetched successfully",
				data: boxes.map((b: any) => ({
					...b,
					box_id: b.box_display_id,
				})),
			},
			{
				status: 200,
			},
		);
	},
);

