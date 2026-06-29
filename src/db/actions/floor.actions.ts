import { APIError } from "@/types/error";
import { prisma } from "..";
import type { Prisma } from "../types";

interface CreateFloorArgs {
	name: string;
	client_id: string;
	status?: "active" | "suspended";
}

export const createFloor = async (args: CreateFloorArgs) => {
	const { name, client_id, status } = args;

	// Check for uniqueness of Name + client_id
	const existingByName = await prisma.vertical_hospitality_floor.findFirst({
		where: {
			name,
			client_id,
			status: "active",
		},
	});
	if (existingByName) {
		throw new APIError(
			"A floor with this name already exists under your account.",
			"hospitality.floor.create.DUPLICATE_NAME",
			undefined,
			409,
		);
	}

	return prisma.vertical_hospitality_floor.create({
		data: {
			name,
			client_id,
			status,
		},
	});
};

interface GetFloorByIdArgs {
	id: string;
	client_id: string;
}

export const getFloorById = async (args: GetFloorByIdArgs) => {
	const { client_id, id } = args;

	const floor = await prisma.vertical_hospitality_floor.findUnique({
		where: { id },
	});

	if (!floor) {
		throw new APIError("Floor not found", "hospitality.floor.get.NOT_FOUND", undefined, 404);
	}

	if (floor.client_id !== client_id) {
		throw new APIError("Access denied", "hospitality.floor.get.ACCESS_DENIED", undefined, 403);
	}

	return floor;
};

interface GetFloorsArgs {
	query?: string;
	status?: "active" | "suspended";
	page_size?: number;
	page_number?: number;
	client_id: string;
	fetch_all?: boolean;
}

export const getFloors = async (args: GetFloorsArgs) => {
	const {
		query,
		status,
		page_size,
		page_number,
		client_id,
		fetch_all,
	} = args;

	const floorsQuery: Prisma.vertical_hospitality_floorFindManyArgs = {
		where: {
			client_id,
			status: status || { not: "suspended" },
			name: query
				? {
						contains: query,
					}
				: undefined,
		},
		include: {
			_count: {
				select: {
					boxes: true,
				},
			},
		},
		skip:
			!fetch_all && page_number && page_size
				? (page_number - 1) * page_size
				: undefined,
		take: !fetch_all && page_size ? page_size : undefined,
	};

	const [floors, count] = await Promise.all([
		prisma.vertical_hospitality_floor.findMany(floorsQuery),
		prisma.vertical_hospitality_floor.count({
			where: floorsQuery.where,
		}),
	]);

	return {
		floors,
		count,
	};
};

interface UpdateFloorArgs {
	id: string;
	client_id: string;
	name?: string;
	status?: "active" | "suspended";
}

export const updateFloor = async (args: UpdateFloorArgs) => {
	const { id, client_id, name, status } = args;

	// Check if exists and belongs to client
	const floor = await prisma.vertical_hospitality_floor.findUnique({
		where: { id, client_id },
	});
	if (!floor) {
		throw new APIError("Floor not found", "hospitality.floor.update.NOT_FOUND", undefined, 404);
	}

	if (name && name !== floor.name) {
		// Check for duplicate name under client
		const existingByName = await prisma.vertical_hospitality_floor.findFirst({
			where: {
				name,
				client_id,
				status: "active",
				id: { not: id },
			},
		});
		if (existingByName) {
			throw new APIError(
				"A floor with this name already exists under your account.",
				"hospitality.floor.update.DUPLICATE_NAME",
				undefined,
				409,
			);
		}
	}

	return prisma.vertical_hospitality_floor.update({
		where: { id, client_id },
		data: {
			name,
			status,
		},
	});
};

interface DeleteFloorsArgs {
	ids: string[];
	client_id: string;
}

export const deleteFloors = async (args: DeleteFloorsArgs) => {
	const { ids, client_id } = args;

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: ids }, client_id },
	});

	if (floors.length === 0) {
		throw new APIError("Floors not found", "hospitality.floor.delete.NOT_FOUND", undefined, 404);
	}

	if (floors.length !== ids.length) {
		throw new APIError("Some floors were not found or access denied", "hospitality.floor.delete.PARTIAL_FOUND", undefined, 409);
	}

	const clientRecord = await prisma.client.findUnique({
		where: { id: client_id },
	});

	return prisma.$transaction(async (tx) => {
		// Backup to deleted floors table
		await tx.vertical_hospitality_floor_deleted.createMany({
			data: floors.map((f) => ({
				id: f.id,
				name: f.name,
				client_id: f.client_id,
				client_name: clientRecord?.name || "",
				x_primary_key: f.id,
			})),
		});

		// Unassign boxes if any (optional clean up)
		await tx.vertical_hospitality_floor_box.deleteMany({
			where: {
				floor_id: { in: ids },
			},
		});

		// Delete from active floors
		const deleteResult = await tx.vertical_hospitality_floor.deleteMany({
			where: {
				id: { in: ids },
				client_id,
			},
		});

		return { deleted_count: deleteResult.count };
	});
};

interface SuspendFloorsArgs {
	ids: string[];
	client_id: string;
}

export const suspendFloors = async (args: SuspendFloorsArgs) => {
	const { ids, client_id } = args;

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: ids }, client_id },
	});

	if (floors.length === 0) {
		throw new APIError("Floors not found", "hospitality.floor.suspend.NOT_FOUND", undefined, 404);
	}

	const toSuspend = floors.filter((f) => f.status !== "suspended");

	if (toSuspend.length === 0) {
		throw new APIError(
			"All selected floors are already suspended",
			"hospitality.floor.suspend.ALREADY_SUSPENDED",
			undefined,
			409,
		);
	}

	const result = await prisma.vertical_hospitality_floor.updateMany({
		where: {
			id: { in: toSuspend.map((f) => f.id) },
			client_id,
		},
		data: {
			status: "suspended",
		},
	});

	return { suspended_count: result.count };
};

interface ReactivateFloorsArgs {
	ids: string[];
	client_id: string;
}

export const reactivateFloors = async (args: ReactivateFloorsArgs) => {
	const { ids, client_id } = args;

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: ids }, client_id, status: "suspended" },
	});

	if (floors.length === 0) {
		throw new APIError("No suspended floors found to reactivate", "hospitality.floor.reactivate.NOT_FOUND", undefined, 404);
	}

	const result = await prisma.vertical_hospitality_floor.updateMany({
		where: {
			id: { in: floors.map((f) => f.id) },
			client_id,
		},
		data: {
			status: "active",
		},
	});

	return { reactivated_count: result.count };
};

interface SearchHospitalityFloorsArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: string;
}

export const searchHospitalityFloors = async (args: SearchHospitalityFloorsArgs) => {
	const { query, client_id, limit = 50, status = "all" } = args;

	return prisma.vertical_hospitality_floor.findMany({
		where: {
			client_id,
			status:
				status === "all"
					? { not: "suspended" }
					: (status as "active" | "suspended"),
			name: query
				? {
						contains: query,
					}
				: undefined,
		},
		select: {
			id: true,
			name: true,
			status: true,
			created_at: true,
			updated_at: true,
		},
		take: limit,
	});
};
