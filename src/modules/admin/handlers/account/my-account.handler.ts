import { getUniqueAdmin } from "@/db/actions/admin.actions";
import type { admin } from "@/db/types";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { createHandlers } from "@/utils/hono-factory";

interface AdminWithPasswordFlag extends admin {
	is_password_set: boolean;
}

interface ResponseData {
	user: AdminWithPasswordFlag;
	role: "admin" | "employee";
}

export const getMyAccountHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { user_id } = context.var;

		const admin = await getUniqueAdmin({
			id: user_id,
		});

		if (!admin) {
			throw new APIError("No admin found", undefined, undefined, 404);
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					user: {
						...admin.user,
						is_password_set: admin.user.password !== null,
						password: null,
					},
					role: admin.type,
				},
			},
			{
				status: 200,
			},
		);
	},
);
