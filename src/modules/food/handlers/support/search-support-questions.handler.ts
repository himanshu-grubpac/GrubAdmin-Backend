import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { searchSupportQuestionsRequestQueryValidator } from "food/validators/support.validators.ts";
import { getVertical } from "@/db/actions/vertical.actions.ts";
import { DELIVERY_VERTICAL_NAME } from "@/configs/constants.ts";
import { APIError } from "@/types/error";
import { getFaqQuestions } from "@/db/actions/faq.actions.ts";
import type { faq_question } from "@/db/types";
import type { APIResponse } from "@/types/api";

interface ResponseData {
    faqs: {
        id: string;
        question: string;
        category?: string | null;
    }[];
    count: number;
}

export const searchSupportQuestionsHandler = createHandlers(
    foodAuthGuard(),
    searchSupportQuestionsRequestQueryValidator,
    async (context) => {
        const { query, limit, category_id } = context.req.valid("query");

        const vertical = await getVertical(DELIVERY_VERTICAL_NAME);

        if (!vertical) {
            throw new APIError("No such vertical found!", undefined, undefined, 400);
        }

        const questionsResponse = await getFaqQuestions({
            vertical_id: vertical.id,
            query,
            state: "active",
            publishing_status: "published",
            pageSize: limit,
            category_id,
        });

        const mappedFaqs: any[] = [];
        for (const faq of questionsResponse.faqs as any[]) {
            if (category_id) {
                // If category_id is provided, don't include the "category" key
                mappedFaqs.push({
                    id: faq.id,
                    question: faq.question,
                });
            } else {
                if (faq.categories && faq.categories.length > 0) {
                    for (const cat of faq.categories) {
                        mappedFaqs.push({
                            id: faq.id,
                            question: faq.question,
                            category: cat.category.name,
                        });
                    }
                } else {
                    mappedFaqs.push({
                        id: faq.id,
                        question: faq.question,
                        category: null,
                    });
                }
            }
        }

        return context.json<APIResponse<ResponseData>>(
            {
                success: true,
                code: 200,
                data: {
                    faqs: mappedFaqs,
                    count: mappedFaqs.length,
                },
            },
            {
                status: 200,
            },
        );
    },
);
