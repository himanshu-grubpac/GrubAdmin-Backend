import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const getSupportCategoriesHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const vertical_id = context.get("vertical_id");

		const categories = await prisma.faq_category.findMany({
			where: { vertical_id, status: "active" },
			include: { icon: true },
			orderBy: { index: "asc" },
		});

		return context.json<APIResponse<typeof categories>>({
			success: true,
			code: 200,
			data: categories,
		});
	},
);
