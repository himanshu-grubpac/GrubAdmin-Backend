import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { searchBoxesRequestQueryValidator } from "hospitality/validators/box.validators.ts";
import { searchHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const searchGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	searchBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const boxes = await searchHospitalityBoxes({
			query: query || "",
			limit,
			status: status as any,
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
