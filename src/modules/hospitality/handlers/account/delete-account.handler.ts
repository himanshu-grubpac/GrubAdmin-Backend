import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const deleteAccountHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		throw new APIError("Administrators cannot delete their accounts through this API.", "hospitality.account.ADMIN_DELETE_BLOCKED", undefined, 400);
	},
);
