import { prisma } from "@/db";

interface CreateVerticalArgs {
	name: string;
}

export const createVertical = async (args: CreateVerticalArgs) => {
	return prisma.vertical.create({
		data: {
			name: args.name,
		},
	});
};

// You can pass both id or name as an argument making it an unique identifier
export const getVertical = async (uniqueIdentifier: string) => {
	return prisma.vertical.findFirst({
		where: {
			OR: [
				{
					id: uniqueIdentifier,
				},
				{
					name: uniqueIdentifier,
				},
			],
		},
	});
};

export const getVerticals = async () => {
	return prisma.vertical.findMany();
};
