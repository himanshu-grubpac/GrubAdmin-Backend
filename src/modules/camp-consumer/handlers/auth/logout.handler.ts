import { createHandlers } from "@/utils/hono-factory";
import type { APIResponse } from "@/types/api";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { bumpCampingConsumerAuthTokenVersion } from "@/db/actions/camp-consumer/consumer.actions";

export const logoutHandler = createHandlers(campingAuthGuard(), async (context) => {
	const user_id = context.get("user_id");
	await bumpCampingConsumerAuthTokenVersion(user_id);

	return context.json<APIResponse>(
		{
			success: true,
			code: 200,
			message: "Logged out successfully",
		},
		{ status: 200 },
	);
});
