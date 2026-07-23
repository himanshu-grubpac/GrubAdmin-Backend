import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { deleteAdmins } from "@/db/actions/admin.actions.ts";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { deleteAuthCookie } from "@/utils/cookie.ts";

export const deleteAccountHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { user_id, type } = context.var;

		if (type !== "employee") {
			throw new APIError(
				"Only employees can delete their account through this API.",
				undefined,
				undefined,
				400,
			);
		}

		await deleteAdmins([user_id]);
		deleteAuthCookie(context);

		return context.json<APIResponse>({ success: true, code: 200 }, { status: 200 });
	},
);
