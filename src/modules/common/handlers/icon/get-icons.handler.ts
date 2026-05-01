import { createHandlers } from "@/utils/hono-factory.ts";
import { getIconRequestQueryValidator } from "@/modules/common/validators/icons.validators.ts";
import { getIcons } from "@/db/actions/icon.actions.ts";
import type { icon } from "@/db/types";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	icons: icon[];
	count: number;
}

export const getIconsHandlers = createHandlers(
	getIconRequestQueryValidator,
	async (context) => {
		const { page_size, page_number, query } = context.req.valid("query");

		const iconsData = await getIcons({
			query,
			pageSize: page_size,
			pageNumber: page_number,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: iconsData,
			},
			{
				status: 200,
			},
		);
	},
);
