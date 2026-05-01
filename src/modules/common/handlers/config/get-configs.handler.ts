import { createHandlers } from "@/utils/hono-factory.ts";
import type { system_config } from "@/db/types";
import { getConfigs } from "@/db/actions/config.actions.ts";
import type { APIResponse } from "@/types/api";

interface ResponseData {
	configs: system_config[];
}

export const getConfigsHandler = createHandlers(async (context) => {
	const configs = await getConfigs();

	return context.json<APIResponse<ResponseData>>(
		{
			success: true,
			code: 200,
			data: {
				configs,
			},
		},
		{
			status: 200,
		},
	);
});
