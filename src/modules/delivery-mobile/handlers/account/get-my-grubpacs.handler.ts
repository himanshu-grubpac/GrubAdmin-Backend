import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getMyGrubpacsRequestQueryValidator } from "@/modules/delivery-mobile/validators/account.validators.ts";
import { getMyGrubpacsForClient } from "@/db/actions/delivery-mobile/box.actions.ts";
import { calculatePagination } from "@/utils/pagination.ts";
import type { MyGrubpacListItem } from "@/db/actions/delivery-mobile/box.actions.ts";

interface ResponseData {
	boxes: MyGrubpacListItem[];
	count: number;
}

export const getMyGrubpacsHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	getMyGrubpacsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { power_status, query, page, limit } = context.req.valid("query");

		if (!client_id) {
			return context.json<APIResponse<ResponseData>>(
				{
					success: false,
					code: 403,
					error: "Client context missing",
				},
				{ status: 403 },
			);
		}

		const { boxes, count, page: effectivePage, limit: effectiveLimit } =
			await getMyGrubpacsForClient({
				client_id,
				power_status,
				query,
				page,
				limit,
			});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					boxes,
					count,
				},
				pagination: calculatePagination(effectivePage, effectiveLimit, count),
			},
			{
				status: 200,
			},
		);
	},
);
