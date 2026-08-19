import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { searchBoxesRequestQueryValidator } from "hospitality/validators/box.validators.ts";
import { searchHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const searchGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	searchBoxesRequestQueryValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const boxes = await searchHospitalityBoxes({
			query: query || "",
			limit,
			status: status as "active" | "suspended" | undefined,
			client_id,
			vertical_id: vertical_id || undefined,
		});

		return context.json<APIResponse<{ boxes: typeof boxes }>>(
			{
				success: true,
				code: 200,
				message: "Boxes search results fetched successfully",
				data: { boxes },
			},
			{ status: 200 },
		);
	},
);
