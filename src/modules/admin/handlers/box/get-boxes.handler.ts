import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getBoxesRequestQueryValidator } from "@/modules/admin/validators/box.validators.ts";
import { getBoxes } from "@/db/actions/box.actions.ts";
import type { box } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";

interface ResponseData {
	boxes: box[];
	count: number;
}

export const getBoxesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { query, page_size, page_number, state, verticals } =
			context.req.valid("query");

		const boxesData = await getBoxes({
			query,
			pageSize: page_size,
			pageNumber: page_number,
			state,
			verticals: typeof verticals === "string" ? [verticals] : verticals,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					...boxesData,
					boxes: boxesData.boxes.map((b) => ({
						...b,
						box_id: (b as any).box_display_id,
					})) as any,
				},
				pagination: calculatePagination(page_number, page_size, boxesData.count),
			},
			{
				status: 200,
			},
		);
	},
);
