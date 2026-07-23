import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { getBoxesRequestQueryValidator } from "@/modules/admin/validators/box.validators.ts";
import { getBoxes } from "@/db/actions/box.actions.ts";
import type { box } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { Permission } from "@/utils/permission.ts";
import { GRUBPACS_PERMISSIONS } from "@/configs/constants.ts";

interface ResponseData {
	boxes: box[];
	count: number;
}

export const getBoxesHandler = createHandlers(
	authGuard(["admin", "employee"]),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { admin } = context.var;
		const { query, page_size, page_number, state, verticals } =
			context.req.valid("query");

		const perms = Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				grubpac: [GRUBPACS_PERMISSIONS.view_grubpacs],
				verticals: (typeof verticals === "string" ? [verticals] : verticals) as any,
			},
		});

		const verticalsAllowed: string[] | undefined = !perms.is_super_admin
			? (perms.perm["verticals"] as string[])
			: undefined;

		const requestedVerticals =
			typeof verticals === "string" ? [verticals] : verticals;
		const effectiveVerticals = requestedVerticals?.length
			? verticalsAllowed
				? requestedVerticals.filter((v) =>
						verticalsAllowed.includes(v),
					)
				: requestedVerticals
			: verticalsAllowed;

		const boxesData = await getBoxes({
			query,
			pageSize: page_size,
			pageNumber: page_number,
			state,
			verticals: effectiveVerticals,
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
