import { getVertical } from "@/db/actions/vertical.actions.ts";
import { prisma } from "@/db";
import { APIError } from "@/types/error";

export interface MobileSupportAnswerData {
	answer: string;
	publishing_status: string;
	status: string;
	attachments: unknown[];
	faq: {
		id: string;
		question: string;
	};
}

/**
 * Figma mobile apps use GET /support/answer?id= — same payload as portal /support/answer?faq_id=
 */
export async function fetchMobileSupportAnswer(
	faqId: string,
	verticalName: string,
): Promise<MobileSupportAnswerData> {
	const vertical = await getVertical(verticalName);

	if (!vertical) {
		throw new APIError("No such vertical found!", undefined, undefined, 400);
	}

	const faq = await prisma.faq_question.findFirst({
		where: {
			id: faqId,
			NOT: {
				status: "deleted",
			},
			categories: {
				some: {
					category: {
						vertical_id: vertical.id,
					},
				},
			},
		},
	});

	if (!faq || faq.publishing_status !== "published") {
		throw new APIError("FAQ not found", undefined, undefined, 404);
	}

	return {
		answer: faq.answer,
		publishing_status: faq.publishing_status,
		status: faq.status,
		attachments: (faq.attachments as unknown[]) || [],
		faq: {
			id: faq.id,
			question: faq.question,
		},
	};
}
