import { createHandlers } from "@/utils/hono-factory.ts";
import { campingAuthGuard } from "@/middlewares/auth/camping-auth-guard.ts";
import { getConsumerDashboard } from "@/db/actions/camp-consumer/dashboard.actions.ts";
import type { APIResponse } from "@/types/api";
import type { CampingMobileDashboardData } from "@/types/camping-mobile/dashboard";
import type { vertical_camping_consumer } from "@/db/types";

export const getDashboardHandler = createHandlers(campingAuthGuard(), async (context) => {
	const user_id = context.get("user_id");
	const client_id = context.get("client_id");
	const user = context.get("user") as vertical_camping_consumer;

	const data = await getConsumerDashboard({
		consumer_id: user_id,
		client_id,
		full_name: user.full_name,
		password: user.password,
	});

	return context.json<APIResponse<CampingMobileDashboardData>>({
		success: true,
		code: 200,
		data,
	});
});
