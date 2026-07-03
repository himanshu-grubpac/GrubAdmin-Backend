import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";

export const deleteAccountEligibilityHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{ status: 200 },
		);
	},
);
