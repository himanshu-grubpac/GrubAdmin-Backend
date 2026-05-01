import { prisma } from "@/db";

interface CreateConfigArgs {
	key: string;
	value: string;
}

export const createConfig = async (args: CreateConfigArgs) => {
	return prisma.system_config.create({
		data: {
			...args,
		},
	});
};

export const getConfigs = async () => {
	return prisma.system_config.findMany();
};
