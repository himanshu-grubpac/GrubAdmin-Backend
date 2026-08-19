import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { listDriverBoxes } from "@/db/actions/delivery-mobile/box.actions.ts";
import { listDriverBoxesRequestQueryValidator } from "@/modules/delivery-mobile/validators/box.validators.ts";
import { calculatePagination } from "@/utils/pagination.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxSummary } from "@/types/delivery-mobile-box";

export const listBoxesHandler = createHandlers(
	deliveryAuthGuard(["delivery"]),
	listDriverBoxesRequestQueryValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const { page, limit } = context.req.valid("query");

		const {
			boxes,
			count,
			page: effectivePage,
			limit: effectiveLimit,
		} = await listDriverBoxes({
			employee_id: user_id,
			client_id,
			page,
			limit,
		});

		return context.json<APIResponse<MobileBoxSummary[]>>(
			{
				success: true,
				code: 200,
				data: boxes,
				pagination: calculatePagination(effectivePage, effectiveLimit, count),
			},
			{ status: 200 },
		);
	},
);
