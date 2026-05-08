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
	return prisma.vertical.findMany();
};
