import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { validatorErrorHandler } from "@/utils/zod.ts";

const getAnswerQueryValidator = zValidator(
	"query",
	z.object({
		question_id: z.string().min(1, { error: "Please provide a question ID" }),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const getSupportAnswerHandler = createHandlers(
	campingAuthGuard(),
	getAnswerQueryValidator,
	async (context) => {
		const { question_id } = context.req.valid("query");

		const question = await prisma.faq_question.findUnique({
			where: { id: question_id },
			include: {
				categories: {
					include: { category: true },
				},
			},
		});

		if (!question || question.status !== "active") {
			throw new APIError("FAQ question not found", undefined, undefined, 404);
		}

		return context.json<APIResponse<typeof question>>({
			success: true,
			code: 200,
			data: question,
		});
	},
);
