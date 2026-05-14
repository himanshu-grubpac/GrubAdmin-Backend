import { APIError } from "@/types/error";
import { checkEmailAvailability } from "@/utils/account";
import type { client, Prisma } from "@/db/types";
import { prisma } from "..";
import { CLIENT_ORDERING_FACTORS, PAGE_SIZE, LONG_PAGE_SIZE } from "@/configs/constants";
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

	if (typeof data.email === "string") {
		await checkEmailAvailability(data.email);
	}

	try {
		return await (select
			? prisma.client.create({
					data,
					select,
				})
			: prisma.client.create({
					data,
					omit,
				}));
	} catch (error: any) {
		if (error.code === "P2002") {
			const targets = error.meta?.target || "";
			if (targets.includes("client_display_id") || targets.includes("client_id")) {
				throw new APIError("Client ID already exists", undefined, undefined, 400);
			}
			throw new APIError("Client already exists with this email or display ID", undefined, undefined, 400);
		}
		if (error.code === "P2003") {
			throw new APIError("Invalid vertical selected", undefined, undefined, 400);
		}
		throw error;
	}
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

	const safePageSize = fetch_all 
		? undefined 
		: Math.min(pageSize ?? PAGE_SIZE, LONG_PAGE_SIZE);
	const safePageNumber = Math.max(pageNumber ?? 1, 1);

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
			!fetch_all && safePageNumber && safePageSize
				? (safePageNumber - 1) * safePageSize
				: undefined,
		take: safePageSize ? safePageSize : undefined,
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

	const normalizedSearchEmail = args.email ? args.email.toLowerCase().trim() : undefined;

	const result = await prisma.client.findFirst({
		where: {
			OR: [
				args.id ? { id: args.id } : {},
				normalizedSearchEmail ? { email: normalizedSearchEmail } : {},
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

interface UpdateClientArgs {
	id: string;
	data: Prisma.clientUpdateInput;
	select?: Prisma.clientSelect;
	omit?: Prisma.clientOmit;
}

export const updateClient = async (args: UpdateClientArgs) => {
	const { id, data, select, omit } = args;

	if (select && omit) {
		throw new Error("You cannot use both select and omit query together!");
	}

	// Normalize email if provided
	if (typeof data.email === "string") {
		await checkEmailAvailability(data.email, id);
	}

	try {
		return await (select
			? prisma.client.update({
					where: { id },
					data,
					select,
				})
			: prisma.client.update({
					where: { id },
					data,
					omit,
				}));
	} catch (error: any) {
		if (error.code === "P2002") {
			const targets = error.meta?.target || "";
			if (targets.includes("client_display_id") || targets.includes("client_id")) {
				throw new APIError("Client ID already exists", undefined, undefined, 400);
			}
			throw new APIError("Client already exists with this email or display ID", undefined, undefined, 400);
		}
		if (error.code === "P2025") {
			throw new APIError("Client not found", undefined, undefined, 404);
		}
		throw error;
	}
};

export const deleteClient = async (id: string) => {
	return await prisma.$transaction(async (tx) => {
		const client = await tx.client.findUnique({
			where: { id },
			include: { vertical: true },
		});

		if (!client) {
			throw new APIError("Client not found", undefined, undefined, 404);
		}

		// Check for dependencies
		const [boxes, employees, consumers, restaurants] = await Promise.all([
			tx.box.count({ where: { client_id: id } }),
			tx.vertical_food_employee.count({ where: { client_id: id } }),
			tx.vertical_food_consumer.count({ where: { client_id: id } }),
			tx.restaurant.count({ where: { client_id: id } }),
		]);

		if (boxes > 0 || employees > 0 || consumers > 0 || restaurants > 0) {
			throw new APIError(
				"Cannot delete client with active dependencies (boxes, employees, consumers, or restaurants)",
				undefined,
				undefined,
				400,
			);
		}

		// Move to client_deleted
		await tx.client_deleted.create({
			data: {
				name: client.name,
				client_display_id: client.client_display_id,
				organization_name: client.organization_name,
				country: client.country,
				state: client.state,
				email: client.email,
				mobile_number: client.mobile_number,
				country_code: client.country_code,
				vertical_id: client.vertical_id,
				vertical_name: client.vertical?.name,
				profile_pic: client.profile_pic,
				x_primary_key: client.id,
			},
		});

		return await tx.client.delete({
			where: { id },
		});
	});
};
