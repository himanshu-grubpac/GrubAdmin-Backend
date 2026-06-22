import { createHandlers } from "@/utils/hono-factory";
import { medicalAuthGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";

export const logoutHandler = createHandlers(
	medicalAuthGuard(),
	async (context) => {
		const { user_id } = context.var;

		return context.json<APIResponse<null>>({
			success: true,
			message: "Logged out successfully!",
			code: 200,
		});
	},
);
