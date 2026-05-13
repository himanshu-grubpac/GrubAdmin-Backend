import { createHandlers } from "@/utils/hono-factory";
import { authGuard } from "@/middlewares/auth";
import { deleteAuthCookie } from "@/utils/cookie";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const logoutHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		deleteAuthCookie(context);

		return context.json<APIResponse>(
			{
				success: true,
				...resolveMessageTemplate("admin.auth.logout.SUCCESS"),
			},
			{ status: 200 },
		);
	},
);