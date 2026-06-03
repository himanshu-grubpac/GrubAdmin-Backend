import { prisma } from "@/db";
import { type faq_question, type Prisma } from "@/db/types";
import { APIError } from "@/types/error";

interface CreateFaqQuestionArgs {
	question: string;
	answer: string;
	categories?: string[];
	publishing_status: "published" | "draft";
	attachments?: string[];
}

export const createFaqQuestion = async (args: CreateFaqQuestionArgs) => {
	const question = await prisma.faq_question.create({
		data: {
			question: args.question,
			answer: args.answer,
			publishing_status: args.publishing_status,
			attachments: args.attachments,
		},
	});

	if (args.categories && args.categories.length > 0) {
		const existingCategories = await prisma.faq_category.findMany({
			where: {
				id: {
					in: args.categories,
				},
			},
			select: {
				id: true,
			},
		});

		if (existingCategories.length !== args.categories.length) {
			throw new APIError(
				"Some of the provided categories are invalid or do not exist!",
				undefined,
				undefined,
				400,
			);
		}

		await prisma.faq_question_category.createMany({
			data: args.categories.map((c) => ({
				category_id: c,
				question_id: question.id,
			})),
		});
	}

	return prisma.faq_question.findUnique({
		where: {
			id: question.id,
		},
		include: {
			categories: {
				include: {
					category: true,
				},
			},
		},
	});
};

interface GetFaqQuestionsArgs {
	query?: string;
	pageNumber?: number;
	pageSize?: number;
	publishing_status?: "published" | "draft" | "all";
	state?: "active" | "suspended" | "deleted";
	category_id?: string;
	ids?: string[];
	vertical_id?: string;
	includeCategories?: boolean;
}
interface GetFaqsResponse {
	faqs: faq_question[];
	count: number;
}

export const getFaqQuestions = async (
	args: GetFaqQuestionsArgs,
): Promise<GetFaqsResponse> => {
	const {
		state,
		publishing_status,
		query,
		pageSize,
		pageNumber,
		category_id,
		vertical_id,
		ids,
	} = args;

	const faqQuery: Prisma.faq_questionFindManyArgs = {
		where: {
			id: ids
				? {
					in: ids,
				}
				: undefined,
			OR: query
				? [
					{
						question: query
							? {
								contains: query,
							}
							: undefined,
					},
					{
						answer: query
							? {
								contains: query,
							}
							: undefined,
					},
					{
						categories: {
							some: {
								category: {
									name: {
										contains: query,
									},
								},
							},
						},
					},
				]
				: undefined,
			publishing_status:
				publishing_status === "all" ? undefined : publishing_status,
			status: state,
			categories: category_id
				? {
					some: {
						category_id,
						category: vertical_id
							? {
								vertical_id,
							}
							: undefined,
					},
				}
				: undefined,
		},
		take: pageSize,
		skip: pageNumber && pageSize ? (pageNumber - 1) * pageSize : undefined,
		include: {
			categories: {
				include: {
					category: true,
				},
			},
		},
	};

	const [faqsResponse, faqsCountResponse] = await Promise.allSettled([
		prisma.faq_question.findMany(faqQuery),
		prisma.faq_question.count({
			where: faqQuery.where,
		}),
	]);

	if (faqsResponse.status === "rejected") {
		throw new APIError(String(faqsResponse.reason), undefined, undefined, 400);
	}

	if (faqsCountResponse.status === "rejected") {
		throw new APIError(String(faqsCountResponse.reason), undefined, undefined, 400);
	}

	return {
		faqs: faqsResponse.value,
		count: faqsCountResponse.value,
	};
};

export const deleteFaqQuestions = async (questionIds: string[]) => {
	return prisma.faq_question.updateMany({
		where: {
			OR: questionIds.map((id) => ({
				id,
			})),
			NOT: {
				status: "deleted",
			},
		},
		data: {
			status: "deleted",
		},
	});
};

interface UpdateFaqQuestionsPublishingStatusArgs {
	questionIds: string[];
	publishing_status: "published" | "draft";
}

export const updateFaqQuestionsPublishingStatus = async (
	args: UpdateFaqQuestionsPublishingStatusArgs,
) => {
	return prisma.faq_question.updateMany({
		where: {
			OR: args.questionIds.map((id) => ({
				id,
			})),
			NOT: {
				status: "deleted",
			},
		},
		data: {
			publishing_status: args.publishing_status,
		},
	});
};

interface UpdateFaqQuestionArgs {
	question?: string;
	answer?: string;
	categories?: string[];
	publishing_status?: "published" | "draft";
	id: string;
	files_added?: string[];
	file_keys_deleted?: string[];
}

export const updateFaqQuestion = async (args: UpdateFaqQuestionArgs) => {
	const {
		question,
		answer,
		publishing_status,
		id,
		categories,
		file_keys_deleted,
		files_added,
	} = args;

	const faq = await prisma.faq_question.findUnique({
		where: {
			id,
			NOT: {
				status: "deleted",
			},
		},
		include: {
			categories: true,
		},
	});

	if (!faq) {
		throw new APIError("Faq question not found", undefined, undefined, 404);
	}

	const existingAttachments = (faq.attachments as string[] | null) ?? [];
	const filesDeletedSet = new Set(file_keys_deleted);

	const updatedFiles = existingAttachments.filter(
		(ex) => !filesDeletedSet.has(ex),
	);

	if (files_added) {
		updatedFiles.push(...files_added);
	}

	if (question || answer || publishing_status) {
		await prisma.faq_question.update({
			where: {
				id,
				NOT: {
					status: "deleted",
				},
			},
			data: {
				question,
				answer,
				publishing_status,
				attachments: updatedFiles,
			},
		});
	}

	if (categories && categories.length > 0) {
		const existingCategories = await prisma.faq_category.findMany({
			where: {
				id: {
					in: categories,
				},
			},
			select: {
				id: true,
			},
		});

		if (existingCategories.length !== categories.length) {
			throw new APIError(
				"Some of the provided categories are invalid or do not exist!",
				undefined,
				undefined,
				400,
			);
		}

		const oldCategoryIds = new Set(
			faq.categories.map((c) => c.category_id),
		);

		const categoriesToBeAdded: string[] = [];

		for (const category of categories) {
			if (!oldCategoryIds.has(category)) {
				categoriesToBeAdded.push(category);
			} else {
				oldCategoryIds.delete(category);
			}
		}

		const categoriesToBeDeleted: string[] = Array.from(oldCategoryIds);

		await Promise.allSettled([
			prisma.faq_question_category.deleteMany({
				where: {
					OR: categoriesToBeDeleted.map((c) => ({
						category_id: c,
						question_id: id,
					})),
				},
			}),
			prisma.faq_question_category.createMany({
				data: categoriesToBeAdded.map((c) => ({
					category_id: c,
					question_id: id,
				})),
			}),
		]);
	}

	return prisma.faq_question.findUnique({
		where: {
			id,
			NOT: {
				status: "deleted",
			},
		},
		include: {
			categories: {
				include: {
					category: true,
				},
			},
		},
	});
};

interface ToggleSuspendedFaqQuestionsArgs {
	question_ids: string[];
	status: "active" | "suspended";
}

export const toggleSuspendedFaqQuestions = async (
	args: ToggleSuspendedFaqQuestionsArgs,
) => {
	return prisma.faq_question.updateMany({
		where: {
			id: {
				in: args.question_ids,
			},
			NOT: {
				status: "deleted",
			},
		},
		data: {
			status: args.status,
		},
	});
};

interface ChangeFaqQuestionsCategoryArgs {
	question_ids: string[];
	current_category: string;
	new_category: string;
}

export const changeFaqQuestionsCategory = async (
	args: ChangeFaqQuestionsCategoryArgs,
) => {
	console.log(args);

	// 1. Fetch active (non-deleted) FAQ question IDs first
	const activeFaqs = await prisma.faq_question.findMany({
		where: {
			id: { in: args.question_ids },
			NOT: { status: "deleted" },
		},
		select: { id: true },
	});
	const activeFaqIds = activeFaqs.map((faq) => faq.id);

	if (activeFaqIds.length === 0) {
		return { count: 0 };
	}

	// 2. Perform the updateMany safely without illegal relation filters
	return prisma.faq_question_category.updateMany({
		where: {
			question_id: {
				in: activeFaqIds,
			},
			category_id: args.current_category,
		},
		data: {
			category_id: args.new_category,
		},
	});
};
export const getFaqQuestionById = async (id: string): Promise<faq_question | null> => {
	return prisma.faq_question.findUnique({
		where: {
			id,
			NOT: {
				status: "deleted",
			},
		},
	});
};
