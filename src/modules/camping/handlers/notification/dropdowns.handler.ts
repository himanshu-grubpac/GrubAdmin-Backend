import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const getNotificationDropdownsHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");

		const boxes = await prisma.box.findMany({
			where: { client_id, vertical_id, status: { not: "unassigned" } },
			select: { id: true, name: true, box_display_id: true },
		});

		return context.json<APIResponse<{ boxes: typeof boxes }>>({
			success: true,
			code: 200,
			data: { boxes },
		});
	},
);
