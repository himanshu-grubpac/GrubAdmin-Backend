import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { validatorErrorHandler } from "@/utils/zod.ts";

const searchQueryValidator = zValidator(
	"query",
	z.object({
		q: z.string().trim().min(1, { error: "Please provide a search query" }),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const searchSupportQuestionsHandler = createHandlers(
	campingAuthGuard(),
	searchQueryValidator,
	async (context) => {
		const vertical_id = context.get("vertical_id");
		const { q } = context.req.valid("query");

		const questions = await prisma.faq_question.findMany({
			where: {
				publishing_status: "published",
				status: "active",
				question: { contains: q },
				categories: {
					some: {
						category: {
							vertical_id,
						},
					},
				},
			},
			include: {
				categories: {
					include: { category: true },
				},
			},
			orderBy: { created_at: "desc" },
			take: 20,
		});

		return context.json<APIResponse<typeof questions>>({
			success: true,
			code: 200,
			data: questions,
		});
	},
);
