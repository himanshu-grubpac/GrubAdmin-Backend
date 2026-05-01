import { getUniqueAdmin } from "@/db/actions/admin.actions";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { createHandlers } from "@/utils/hono-factory";

interface ResponseData {
	eligible: boolean;
}

export const deleteAccountEligiblityHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const { user_id } = context.var;

		const admin = await getUniqueAdmin({
			id: user_id,
		});

		if (!admin) {
			throw new APIError("Admin not found!", undefined, undefined, 404);
		}

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					eligible: admin.type !== "admin",
				},
			},
			{
				status: 200,
			},
		);
	},
);
