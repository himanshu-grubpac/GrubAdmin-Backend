import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { validatorErrorHandler } from "@/utils/zod.ts";

const getFaqQueryValidator = zValidator(
	"query",
	z.object({
		category_id: z.string().optional(),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getSupportQuestionsHandler = createHandlers(
	campingAuthGuard(),
	getFaqQueryValidator,
	async (context) => {
		const vertical_id = context.get("vertical_id");
		const { category_id } = context.req.valid("query");

		const where: any = {
			publishing_status: "published",
			status: "active",
			categories: {
				some: {
					category: {
						vertical_id,
						...(category_id ? { id: category_id } : {}),
					},
				},
			},
		};

		const questions = await prisma.faq_question.findMany({
			where,
			include: {
				categories: {
					include: { category: true },
				},
			},
			orderBy: { created_at: "desc" },
		});

		return context.json<APIResponse<typeof questions>>({
			success: true,
			code: 200,
			data: questions,
		});
	},
);
