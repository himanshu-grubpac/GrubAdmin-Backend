import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { Prisma } from "../prisma";
interface CreateConfigArgs {
	key: string;
	value: string;
}

export const upsertConfig = async (args: CreateConfigArgs) => {
	const normalizedKey = args.key.trim().toLowerCase();

	try {
		return await prisma.system_config.upsert({
			where: {
				key: normalizedKey,
			},
			update: {
				value: args.value.trim(),
			},
			create: {
				key: normalizedKey,
				value: args.value.trim(),
			},
		});
	} catch (error: any) {
		throw new APIError(
			error instanceof Error ? error.message : "Failed to save configuration",
			undefined,
			undefined,
			400,
		);
	}
};

export const getConfigs = async () => {
	return prisma.system_config.findMany();
};
