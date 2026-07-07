import { createHandlers } from "@/utils/hono-factory";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const logoutHandler = createHandlers(
	async (context) => {
		return context.json<APIResponse<null>>({
			success: true,
			...resolveMessageTemplate("camping.auth.LOGOUT_SUCCESS"),
			data: null,
		});
	},
);
