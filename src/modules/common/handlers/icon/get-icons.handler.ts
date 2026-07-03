import { createHandlers } from "@/utils/hono-factory.ts";
import { getIconRequestQueryValidator } from "@/modules/common/validators/icons.validators.ts";
import { getIcons } from "@/db/actions/icon.actions.ts";
import type { icon } from "@/db/types";
import type { APIResponse } from "@/types/api";
import { resolveIconUrl } from "@/utils/asset-url.ts";

interface IconWithUrl extends icon {
	icon_url: string;
}

interface ResponseData {
	icons: IconWithUrl[];
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

		const iconsWithUrl = await Promise.all(
			iconsData.icons.map(async (ic) => ({
				...ic,
				icon_url: await resolveIconUrl(ic.bucket_key),
			})),
		);

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					icons: iconsWithUrl,
					count: iconsData.count,
				},
			},
			{
				status: 200,
			},
		);
	},
);
