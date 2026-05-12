import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { Prisma } from "../prisma";
interface CreateConfigArgs {
	key: string;
	value: string;
}

export const createConfig = async (args: CreateConfigArgs) => {
	const normalizedKey = args.key.trim().toLowerCase();

	const existingConfig = await prisma.system_config.findFirst({
		where: {
			key: {
				equals: normalizedKey,
			},
		},
	});

	if (existingConfig) {
		throw new APIError("Config key already exists", undefined, undefined, 400);
	}

	try {
		return await prisma.system_config.create({
			data: {
				key: normalizedKey,
				value: args.value.trim(),
			},
		});
	} catch (error: any) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			throw new APIError("Config key already exists", undefined, undefined, 400);
		}
		throw error;
	}

};

export const getConfigs = async () => {
	return prisma.system_config.findMany();
};
