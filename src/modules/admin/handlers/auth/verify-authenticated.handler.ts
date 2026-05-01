import { getUniqueAdmin } from "@/db/actions/admin.actions";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import type { UserType } from "@/types/common";
import { APIError } from "@/types/error";
import { createHandlers } from "@/utils/hono-factory";

interface ResponseData {
	type: UserType;
	roles: [];
}

export const verifyAuthenticatedHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { user_id } = context.var;

		const admin = await getUniqueAdmin({
			id: user_id,
		});

		if (!admin) {
			throw new APIError("No admin found!", undefined, undefined, 400);
		}

		console.log(admin);

		if (admin.user.status === "suspended") {
			throw new APIError(
				"Your account has been suspended!",
				undefined,
				undefined,
				401,
			);
		}

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				type: admin.type,
				roles: [],
			},
		});
	},
);

