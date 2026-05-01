import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import type { vertical } from "@/db/types";
import { getVerticals } from "@/db/actions/vertical.actions.ts";

interface ResponseData {
	verticals: vertical[];
}

export const getVerticalsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const verticals = await getVerticals();

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				verticals,
			},
		});
	},
);
