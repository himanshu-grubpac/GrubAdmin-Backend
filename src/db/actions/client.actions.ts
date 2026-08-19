import { APIError } from "@/types/error";
import { checkEmailAvailability } from "@/utils/account";
import type { client, Prisma } from "@/db/types";
import { prisma } from "..";
import { CLIENT_ORDERING_FACTORS, PAGE_SIZE, LONG_PAGE_SIZE } from "@/configs/constants";
import type { BoxType } from "@/types/common/box-type.ts";
import {
	claimVerticalEmail,
	releaseVerticalEmailByOwner,
	syncVerticalEmailRegistry,
} from "@/utils/vertical-email-registry";

interface CreateClientArgs {
	data: Prisma.clientCreateInput;
	select?: Prisma.clientSelect;
	omit?: Prisma.clientOmit;
}

const resolveCreateVerticalId = (data: Prisma.clientCreateInput): string | undefined => {
	const dataAny = data as Record<string, unknown> & {
		vertical?: { connect?: { id?: string } };
	};
	if (typeof dataAny.vertical_id === "string") return dataAny.vertical_id;
	if (typeof dataAny.vertical?.connect?.id === "string") return dataAny.vertical.connect.id;
	return undefined;
};

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

	const verticalId = resolveCreateVerticalId(data);

	if (typeof data.email === "string") {
		await checkEmailAvailability(data.email, undefined, verticalId);
	}

	try {
		return await prisma.$transaction(async (tx) => {
			const created = select
				? await tx.client.create({
						data,
						select,
					})
				: await tx.client.create({
						data,
						omit,
					});

			const createdId = (created as { id: string }).id;
			const createdVerticalId =
				(created as { vertical_id?: string | null }).vertical_id ?? verticalId;

			if (typeof data.email === "string" && createdVerticalId) {
				await claimVerticalEmail({
					db: tx,
					verticalId: createdVerticalId,
					email: data.email,
					ownerType: "client",
					ownerId: createdId,
				});
			}

			return created;
		});
	} catch (error: any) {
		if (error instanceof APIError) throw error;
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
	/** Max page_size when paginated; list endpoints default to LONG_PAGE_SIZE. */
	maxPageSize?: number;
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
		: Math.min(pageSize ?? PAGE_SIZE, args.maxPageSize ?? LONG_PAGE_SIZE);
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

	const existing = await prisma.client.findUnique({
		where: { id },
		select: { vertical_id: true, email: true },
	});

	// Normalize email if provided — uniqueness is scoped to the client's vertical
	if (typeof data.email === "string") {
		await checkEmailAvailability(
			data.email,
			id,
			existing?.vertical_id ?? undefined,
		);
	}

	try {
		return await prisma.$transaction(async (tx) => {
			const updated = select
				? await tx.client.update({
						where: { id },
						data,
						select,
					})
				: await tx.client.update({
						where: { id },
						data,
						omit,
					});

			if (typeof data.email === "string" && existing?.vertical_id) {
				await syncVerticalEmailRegistry({
					db: tx,
					verticalId: existing.vertical_id,
					email: data.email,
					ownerType: "client",
					ownerId: id,
				});
			}

			return updated;
		});
	} catch (error: any) {
		if (error instanceof APIError) throw error;
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
			tx.vertical_delivery_employee.count({ where: { client_id: id } }),
			tx.vertical_delivery_consumer.count({ where: { client_id: id } }),
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

		await releaseVerticalEmailByOwner({
			db: tx,
			ownerType: "client",
			ownerId: id,
		});

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
