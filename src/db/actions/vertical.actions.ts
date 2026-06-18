import { prisma } from "@/db";
import { APIError } from "@/types/error";

interface CreateVerticalArgs {
	name: string;
}

export const createVertical = async (args: CreateVerticalArgs) => {
	const cleanName = args.name.trim();
	if (!cleanName) {
		throw new APIError("Vertical name cannot be empty", undefined, undefined, 400);
	}

	const normalizedSearch = cleanName.toLowerCase();

	const existing = await prisma.vertical.findFirst({
		where: {
			name: {
				equals: normalizedSearch,
			},
		},
	});

	if (existing) {
		throw new APIError("Vertical name already exists", undefined, undefined, 400);
	}

	try {
		return await prisma.vertical.create({
			data: {
				name: cleanName,
			},
		});
	} catch (error: any) {
		if (error.code === "P2002") {
			throw new APIError("Vertical name already exists", undefined, undefined, 400);
		}
		throw error;
	}
};

// You can pass both id or name as an argument making it an unique identifier
export const getVertical = async (uniqueIdentifier: string) => {
	const cleanIdentifier = uniqueIdentifier.trim();
	return prisma.vertical.findFirst({
		where: {
			OR: [
				{
					id: cleanIdentifier,
				},
				{
					name: {
						equals: cleanIdentifier,
					},
				},
			],
		},
	});
};

interface UpdateVerticalArgs {
	id: string;
	name: string;
}

export const updateVertical = async (args: UpdateVerticalArgs) => {
	const cleanName = args.name.trim();
	if (!cleanName) {
		throw new APIError("Vertical name cannot be empty", undefined, undefined, 400);
	}

	const normalizedSearch = cleanName.toLowerCase();

	const existing = await prisma.vertical.findFirst({
		where: {
			name: {
				equals: normalizedSearch,
			},
			id: {
				not: args.id,
			},
		},
	});

	if (existing) {
		throw new APIError("Vertical name already exists", undefined, undefined, 400);
	}

	try {
		return await prisma.vertical.update({
			where: {
				id: args.id,
			},
			data: {
				name: cleanName,
			},
		});
	} catch (error: any) {
		if (error.code === "P2002") {
			throw new APIError("Vertical name already exists", undefined, undefined, 400);
		}
		throw error;
	}
};

export const getVerticals = async () => {
	return prisma.vertical.findMany({
		where: {
			status: "active",
		},
		orderBy: {
			display_order: "asc",
		},
	});
};

export const deleteVertical = async (id: string) => {
	const vertical = await prisma.vertical.findUnique({
		where: { id },
		include: {
			_count: {
				select: {
					boxes: true,
					clients: true,
					faq_categories: true,
				},
			},
		},
	});

	if (!vertical) {
		throw new APIError("No vertical found!", undefined, undefined, 404);
	}

	if (vertical.status === "deleted") {
		throw new APIError("Vertical is already deleted", undefined, undefined, 400);
	}

	if (
		vertical._count.boxes > 0 ||
		vertical._count.clients > 0 ||
		vertical._count.faq_categories > 0
	) {
		throw new APIError(
			"Cannot delete vertical because active dependencies exist",
			undefined,
			{
				boxes: vertical._count.boxes,
				clients: vertical._count.clients,
				faq_categories: vertical._count.faq_categories,
			},
			400,
		);
	}

	return await prisma.vertical.update({
		where: { id },
		data: { status: "deleted" },
	});
};
