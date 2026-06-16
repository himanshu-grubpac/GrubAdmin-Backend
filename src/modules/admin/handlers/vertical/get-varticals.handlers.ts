import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import type { APIResponse } from "@/types/api";
import type { vertical } from "@/db/types";
import { getVerticals } from "@/db/actions/vertical.actions.ts";
import { BOX_VERTICALS } from "@/configs/constants";

interface ResponseData {
	verticals: vertical[];
}

export const getVerticalsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	async (context) => {
		const allVerticals = await getVerticals();
		const allowlist = BOX_VERTICALS.map((v) => v.toLowerCase());
		const verticals = allVerticals.filter((v) =>
			allowlist.includes(v.name.toLowerCase()),
		);

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				verticals,
			},
		});
	},
);
