import { prisma } from "@/db";
import { type Prisma } from "@/db/types";
import { APIError } from "@/types/error";

interface CreateIconsArgs {
	icons: {
		name: string;
		key: string;
	}[];
}


export const createIcons = async (args: CreateIconsArgs) => {
	const { icons } = args;

	return prisma.$transaction(
		icons.map((i) =>
			prisma.icon.create({
				data: {
					name: i.name,
					bucket_key: i.key,
				},
			}),
		),
	);
};

interface GetIconsArgs {
	query?: string;
	pageSize: number;
	pageNumber: number;
}

export const getIcons = async (args: GetIconsArgs) => {
	const query: Prisma.iconFindManyArgs = {
		where: {
			name: args.query
				? {
					contains: args.query,
				}
				: undefined,
		},
		take: args.pageSize,
		skip: (args.pageNumber - 1) * args.pageSize,
	};

	const [iconsResponse, iconsCountResponse] = await Promise.allSettled([
		prisma.icon.findMany(query),
		prisma.icon.count({
			where: query.where,
		}),
	]);

	if (iconsResponse.status !== "fulfilled") {
		throw new APIError(String(iconsResponse.reason), undefined, undefined, 400);
	}

	if (iconsCountResponse.status !== "fulfilled") {
		throw new APIError(String(iconsCountResponse.reason), undefined, undefined, 400);
	}

	return {
		icons: iconsResponse.value,
		count: iconsCountResponse.value,
	};
};
