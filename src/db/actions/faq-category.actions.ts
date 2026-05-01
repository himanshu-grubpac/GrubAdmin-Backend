import { prisma } from "@/db";
import { type faq_category, type Prisma } from "@/db/types";
import { APIError } from "@/types/error";

interface CreateFaqCategoryArgs {
	name: string;
	icon: string;
	description?: string;
	vertical: string;
}

export const createFaqCategory = async (args: CreateFaqCategoryArgs) => {
	const totalCategories = await prisma.faq_category.count();

	return prisma.faq_category.create({
		data: {
			name: args.name,
			description: args.description,
			icon_id: args.icon,
			vertical_id: args.vertical,
			index: totalCategories + 1,
		},
	});
};

interface UpdateFaqCategoryArgs {
	id: string;
	name?: string;
	icon?: string;
	description?: string;
	vertical?: string;
}

export const updateFaqCategory = async (args: UpdateFaqCategoryArgs) => {
	const { name, description, icon, vertical, id } = args;

	return prisma.faq_category.update({
		where: {
			id,
			NOT: {
				status: "deleted",
			},
		},
		data: {
			name,
			description,
			vertical_id: vertical,
			icon_id: icon,
		},
		include: {
			vertical: true,
			icon: true,
		},
	});
};

interface DeleteFaqCategoriesArgs {
	categories: string[];
}

export const deleteFaqCategories = async (args: DeleteFaqCategoriesArgs) => {
	const { categories } = args;

	const questions = await prisma.faq_question.findMany({
		where: {
			NOT: {
				status: "deleted",
			},
			categories: {
				every: {
					category_id: {
						in: categories,
					},
				},
			},
		},
	});

	const [
		questionsDeletionResponse,
		categoriesDeletionResponse,
		deletionResponse,
	] = await Promise.allSettled([
		prisma.faq_question.updateMany({
			where: {
				id: {
					in: questions.map((q) => q.id),
				},
			},
			data: {
				status: "deleted",
			},
		}),
		prisma.faq_category.updateMany({
			where: {
				id: {
					in: categories,
				},
			},
			data: {
				status: "deleted",
			},
		}),
		prisma.faq_question_category.deleteMany({
			where: {
				category_id: {
					in: categories,
				},
			},
		}),
	]);

	if (questionsDeletionResponse.status === "rejected") {
		throw new APIError(String(questionsDeletionResponse.reason), undefined, undefined, 400);
	}

	if (categoriesDeletionResponse.status === "rejected") {
		throw new APIError(String(categoriesDeletionResponse.reason), undefined, undefined, 400);
	}

	if (deletionResponse.status === "rejected") {
		throw new APIError(String(deletionResponse.reason), undefined, undefined, 400);
	}
};

interface GetFaqCategoryArgs {
	query?: string;
	state?: "active" | "suspended" | "deleted";
	includeQuestions?: boolean;
	questionType?: "published" | "draft";
	fetchAll?: boolean;
	vertical_id?: string;
	ids?: string[];
	pageSize?: number;
	pageNumber?: number;
}

interface GetFaqCategoriesResponse {
	faq_categories: faq_category[];
	count: number;
}

export const getFaqCategory = async (
	args: GetFaqCategoryArgs,
): Promise<GetFaqCategoriesResponse> => {
	const {
		state,
		query,
		includeQuestions,
		vertical_id,
		fetchAll,
		questionType,
		ids,
		pageSize,
		pageNumber,
	} = args;

	const getFaqCategoriesQuery: Prisma.faq_categoryFindManyArgs = {
		where: {
			id: ids
				? {
					in: ids,
				}
				: undefined,
			OR: query
				? [
					{
						name: {
							contains: query,
						},
					},
					{
						description: {
							contains: query,
						},
					},
					includeQuestions
						? {
							questions: {
								some: {
									question: {
										question: {
											contains: query,
										},
									},
								},
							},
						}
						: {},
					includeQuestions
						? {
							questions: {
								some: {
									question: {
										answer: {
											contains: query,
										},
									},
								},
							},
						}
						: {},
				]
				: undefined,
			status: state,
			vertical_id,
		},
		include: {
			vertical: true,
			icon: true,
			questions: includeQuestions
				? {
					where: {
						question: {
							publishing_status: questionType
								? questionType
								: undefined,
						},
					},
				}
				: false,
			_count: {
				select: {
					questions: true,
				},
			},
		},
		orderBy: {
			index: "asc",
		},
		take: !fetchAll ? pageSize : undefined,
		skip:
			!fetchAll && pageNumber && pageSize
				? (pageNumber - 1) * pageSize
				: undefined,
	};

	const [faqCategoriesResponse, faqCategoriesCountResponse] =
		await Promise.allSettled([
			prisma.faq_category.findMany(getFaqCategoriesQuery),
			prisma.faq_category.count({
				where: getFaqCategoriesQuery.where,
			}),
		]);

	if (faqCategoriesResponse.status === "rejected") {
		throw new APIError(String(faqCategoriesResponse.reason), undefined, undefined, 400);
	}

	if (faqCategoriesCountResponse.status === "rejected") {
		throw new APIError(String(faqCategoriesCountResponse.reason), undefined, undefined, 400);
	}

	return {
		faq_categories: faqCategoriesResponse.value,
		count: faqCategoriesCountResponse.value,
	};
};

interface ReorderFaqCategoryArgs {
	order: Record<string, number>;
}

export const reorderFaqCategory = async (args: ReorderFaqCategoryArgs) => {
	const numSet = new Set<number>();

	for (const c of Object.values(args.order)) {
		if (numSet.has(c)) {
			throw new APIError(
				"You have a conflicting list please reload and start re-ordering",
				undefined,
				undefined,
				400,
			);
		} else {
			numSet.add(c);
		}
	}

	return Promise.allSettled(
		Object.keys(args.order).map((id) =>
			prisma.faq_category.update({
				where: {
					id,
				},
				data: {
					index: args.order[id],
				},
			}),
		),
	);
};

interface ToggleSuspendFaqCategoryArgs {
	categories: string[];
	status: "suspended" | "active";
}

export const toggleSuspendFaqCategories = async (
	args: ToggleSuspendFaqCategoryArgs,
) => {
	return prisma.faq_category.updateMany({
		where: {
			id: {
				in: args.categories,
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
