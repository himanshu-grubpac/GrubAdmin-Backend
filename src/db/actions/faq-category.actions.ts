import { prisma } from "@/db";
import { type faq_category, type Prisma } from "@/db/types";
import { APIError } from "@/types/error";


export const normalizeName = (name: string): string => {
	return name.trim().replace(/\s+/g, " ").toLowerCase();
};

interface CreateFaqCategoryArgs {
	name: string;
	icon: string;
	description?: string;
	vertical: string;
}

export const createFaqCategory = async (args: CreateFaqCategoryArgs) => {
	const normalized = normalizeName(args.name);

	// Validate vertical_id exists
	const verticalExists = await prisma.vertical.findUnique({
		where: { id: args.vertical },
	});
	if (!verticalExists) {
		throw new APIError("Invalid vertical ID: Vertical does not exist", undefined, undefined, 400);
	}

	// Validate icon_id exists if provided
	if (args.icon) {
		const iconExists = await prisma.icon.findUnique({
			where: { id: args.icon },
		});
		if (!iconExists) {
			throw new APIError("Invalid icon ID: Icon does not exist", undefined, undefined, 400);
		}
	}

	// Check for existing active/suspended duplicate FAQ categories in the same vertical
	const duplicate = await prisma.faq_category.findFirst({
		where: {
			vertical_id: args.vertical,
			name_normalized: normalized,
			status: {
				in: ["active", "suspended"],
			},
		},
	});

	if (duplicate) {
		throw new APIError("FAQ category with this name already exists in this vertical", undefined, undefined, 400);
	}

	const totalCategories = await prisma.faq_category.count();

	try {
		return await prisma.faq_category.create({
			data: {
				name: args.name,
				name_normalized: normalized,
				description: args.description,
				icon_id: args.icon,
				vertical_id: args.vertical,
				index: totalCategories + 1,
			},
		});
	} catch (error: any) {

		if (error.code === "P2002") {
			throw new APIError("FAQ category with this name already exists in this vertical", undefined, undefined, 400);
		}
		throw error;
	}
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


	const current = await prisma.faq_category.findFirst({
		where: {
			id,
			NOT: {
				status: "deleted",
			},
		},
	});

	if (!current) {
		throw new APIError("FAQ category not found or has been deleted", undefined, undefined, 404);
	}

	const targetVertical = vertical || current.vertical_id;
	const targetName = name !== undefined ? name : current.name;
	const targetNormalized = normalizeName(targetName);


	if (vertical && vertical !== current.vertical_id) {
		const verticalExists = await prisma.vertical.findUnique({
			where: { id: vertical },
		});
		if (!verticalExists) {
			throw new APIError("Invalid vertical ID: Vertical does not exist", undefined, undefined, 400);
		}
	}

	if (icon && icon !== current.icon_id) {
		const iconExists = await prisma.icon.findUnique({
			where: { id: icon },
		});
		if (!iconExists) {
			throw new APIError("Invalid icon ID: Icon does not exist", undefined, undefined, 400);
		}
	}

	if (name !== undefined || vertical !== undefined) {
		const duplicate = await prisma.faq_category.findFirst({
			where: {
				id: { not: id },
				vertical_id: targetVertical,
				name_normalized: targetNormalized,
				status: {
					in: ["active", "suspended"],
				},
			},
		});

		if (duplicate) {
			throw new APIError("FAQ category with this name already exists in this vertical", undefined, undefined, 400);
		}
	}

	try {
		return await prisma.faq_category.update({
			where: { id },
			data: {
				name,
				name_normalized: name !== undefined ? targetNormalized : undefined,
				description,
				vertical_id: vertical,
				icon_id: icon,
			},
			include: {
				vertical: true,
				icon: true,
			},
		});
	} catch (error: any) {

		if (error.code === "P2002") {
			throw new APIError("FAQ category with this name already exists in this vertical", undefined, undefined, 400);
		}
		throw error;
	}
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

	try {
		await prisma.$transaction(async (tx) => {
			await tx.faq_question.updateMany({
				where: {
					id: {
						in: questions.map((q) => q.id),
					},
				},
				data: {
					status: "deleted",
				},
			});


			const fetchedCategories = await tx.faq_category.findMany({
				where: {
					id: { in: categories },
				},
			});

			for (const cat of fetchedCategories) {
				await tx.faq_category.update({
					where: { id: cat.id },
					data: {
						status: "deleted",
						name_normalized: `${cat.name_normalized}-deleted-${cat.id}`,
					},
				});
			}

			await tx.faq_question_category.deleteMany({
				where: {
					category_id: {
						in: categories,
					},
				},
			});
		});
	} catch (error) {
		throw new APIError(
			error instanceof Error ? error.message : String(error),
			undefined,
			undefined,
			400,
		);
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
							publishing_status: questionType ? questionType : undefined,
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

	try {
		const [faqCategories, count] = await Promise.all([
			prisma.faq_category.findMany(getFaqCategoriesQuery),
			prisma.faq_category.count({
				where: getFaqCategoriesQuery.where,
			}),
		]);

		return {
			faq_categories: faqCategories,
			count,
		};
	} catch (error) {
		throw new APIError(
			error instanceof Error ? error.message : String(error),
			undefined,
			undefined,
			400,
		);
	}
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
		}

		numSet.add(c);
	}

	try {
		return await prisma.$transaction(
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
	} catch (error) {
		console.error("FAQ category reorder failed:", error);
		throw new APIError(
			"One or more FAQ categories were not found. Reorder was not applied.",
			undefined,
			undefined,
			400,
		);
	}
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