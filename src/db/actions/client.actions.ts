import { APIError } from "@/types/error";
import type { client, Prisma } from "@/db/types";
import { prisma } from "..";
import type { CLIENT_ORDERING_FACTORS } from "@/configs/constants";
import type { BoxType } from "@/types/common/box-type.ts";

interface CreateClientArgs {
	data: Prisma.clientCreateInput;
	select?: Prisma.clientSelect;
	omit?: Prisma.clientOmit;
}

export const createClient = async (args: CreateClientArgs) => {
	const { data, select, omit } = args;

	if (select && omit) {
		throw new Error("You cannot use both select and omit query together!");
	}

	if (!data.email && !data.mobile_number) {
		throw new APIError(
			"You need to either give Email or Mobile number to create a client",
			undefined,
			undefined,
			400,
		);
	}

	return select
		? prisma.client.create({
				data,
				select,
			})
		: prisma.client.create({
				data,
				omit,
			});
};

interface GetClientsArgs {
	query?: string;
	pageSize?: number;
	pageNumber?: number;
	order?: "asc" | "desc";
	vertical?: BoxType[];
	orderingFactor?: (typeof CLIENT_ORDERING_FACTORS)[number];
	select?: Prisma.clientSelect;
	omit?: Prisma.clientOmit;
	filter?: BoxType[];
	fetch_all?: boolean;
}

interface GetClientsResponse {
	clients: client[];
	count: number;
}

export const getClients = async (
	args: GetClientsArgs,
): Promise<GetClientsResponse> => {
	const {
		order,
		orderingFactor,
		pageNumber,
		pageSize,
		query,
		select,
		omit,
		fetch_all,
	} = args;

	if (select && omit) {
		throw new Error(
			"You can only use either select or omit in clients query",
		);
	}

	const clientsQuery: Prisma.clientFindManyArgs = {
		where: {
			OR: query
				? [
						{
							name: {
								contains: query,
							},
						},
						{
							email: query,
						},
						{
							mobile_number: query,
						},
						{
							organization_name: {
								contains: query,
							},
						},
						{
							country: {
								contains: query,
							},
						},
						{
							state: {
								contains: query,
							},
						},
						{
							client_display_id: {
								contains: query,
							},
						},
					]
				: undefined,
			vertical:
				args.vertical || args.filter
					? {
							name: {
								in: args.vertical ?? args.filter,
							},
						}
					: undefined,
		},
		skip:
			!fetch_all && pageNumber && pageSize
				? (pageNumber - 1) * pageSize
				: undefined,
		take: pageSize ? pageSize : undefined,
		orderBy:
			orderingFactor && order
				? {
						[orderingFactor]: order,
					}
				: undefined,
		include: {
			vertical: true,
			_count: {
				select: {
					boxes: true,
				},
			},
		},
	};

	if (select) {
		clientsQuery.select = select;
	} else if (omit) {
		clientsQuery.omit = omit;
	}

	const [clientsResponse, clientsCountResponse] =
		await Promise.allSettled([
			prisma.client.findMany(clientsQuery),
			prisma.client.count({
				where: clientsQuery.where,
			}),
		]);

	if (clientsResponse.status === "rejected") {
		throw new APIError(String(clientsResponse.reason), undefined, undefined, 400);
	}

	if (clientsCountResponse.status === "rejected") {
		throw new APIError(String(clientsCountResponse.reason), undefined, undefined, 400);
	}

	return {
		clients: (clientsResponse.value as any[]).map((c) => ({
			...c,
			client_id: c.client_display_id,
		})),
		count: clientsCountResponse.value,
	};
};

interface GetUniqueClientArgs {
	id?: string;
	email?: string;
	client_display_id?: string;
}

export const getUniqueClient = async (args: GetUniqueClientArgs) => {
	if (!args.id && !args.email && !args.client_display_id) {
		throw new Error("Please provide id, email address, or client display ID");
	}

	const result = await prisma.client.findFirst({
		where: {
			OR: [
				args.id ? { id: args.id } : {},
				args.email ? { email: args.email } : {},
				args.client_display_id ? { client_display_id: args.client_display_id } : {},
			].filter(c => Object.keys(c).length > 0)
		},
		include: {
			vertical: true,
		},
	});

	if (!result) return null;

	return {
		...result,
		client_id: result.client_display_id,
	} as any;
};
