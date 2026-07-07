import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const deleteAccountEligibilityHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const client_id = context.get("client_id");

		const boxCount = await prisma.box.count({
			where: { client_id, status: { not: "unassigned" } },
		});

		const can_delete = boxCount === 0;

		return context.json<APIResponse<{ can_delete: boolean; box_count: number }>>({
			success: true,
			code: 200,
			data: {
				can_delete,
				box_count: boxCount,
			},
		});
	},
);
