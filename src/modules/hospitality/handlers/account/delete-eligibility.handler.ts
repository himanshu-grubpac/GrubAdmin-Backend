import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { getDeleteBlockReason } from "./delete-account.handler";

interface ResponseData {
	eligible: boolean;
	reason?: string;
}

export const deleteAccountEligibilityHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { user } = context.var;
		const blockReason = await getDeleteBlockReason(user);

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					eligible: !blockReason,
					...(blockReason ? { reason: blockReason } : {}),
				},
			},
			{ status: 200 },
		);
	},
);
