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
	destination_floor_id?: string | null;
}

export const deleteFloors = async (args: DeleteFloorsArgs) => {
	const { ids, client_id, destination_floor_id } = args;

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: ids }, client_id },
	});

	if (floors.length === 0) {
		throw new APIError("Floors not found", "hospitality.floor.delete.NOT_FOUND", undefined, 404);
	}

	if (floors.length !== ids.length) {
		throw new APIError("Some floors were not found or access denied", "hospitality.floor.delete.PARTIAL_FOUND", undefined, 409);
	}

	if (destination_floor_id) {
		if (ids.includes(destination_floor_id)) {
			throw new APIError("Self-reassignment target is not allowed", undefined, undefined, 400);
		}

		const destFloor = await prisma.vertical_hospitality_floor.findUnique({
			where: { id: destination_floor_id, client_id },
		});

		if (!destFloor) {
			throw new APIError("Destination floor not found", undefined, undefined, 404);
		}
	}

	// Get all boxes currently assigned to the target floors
	const floorBoxes = await prisma.vertical_hospitality_floor_box.findMany({
		where: { floor_id: { in: ids } },
		select: { box_id: true },
	});
	const boxIds = floorBoxes.map((fb) => fb.box_id);

	// Check if there are active boxes
	const activeBoxIdsResult = boxIds.length > 0
		? await prisma.box.findMany({
				where: { id: { in: boxIds }, status: { not: "suspended" } },
				select: { id: true },
			})
		: [];

	if (activeBoxIdsResult.length > 0 && !destination_floor_id) {
		throw new APIError(
			"Cannot delete floor(s) with active boxes assigned unless a destination floor is provided for reassignment.",
			"hospitality.floor.delete.ACTIVE_DEPENDENCIES",
			{ box_count: activeBoxIdsResult.length },
			409,
		);
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

		if (destination_floor_id) {
			// Reassign boxes to destination floor
			// First, delete any floor_box mappings on destination floor for these box IDs to avoid duplicates
			await tx.vertical_hospitality_floor_box.deleteMany({
				where: {
					box_id: { in: boxIds },
					floor_id: destination_floor_id,
				},
			});
			// Reassign mappings
			await tx.vertical_hospitality_floor_box.updateMany({
				where: { floor_id: { in: ids } },
				data: { floor_id: destination_floor_id },
			});
		} else {
			// Unassign/delete mappings
			await tx.vertical_hospitality_floor_box.deleteMany({
				where: { floor_id: { in: ids } },
			});
		}

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
	resource_status?: "suspend" | "assign";
	destination_floor_id?: string | null;
}

export const suspendFloors = async (args: SuspendFloorsArgs) => {
	const { ids, client_id, resource_status = "suspend", destination_floor_id } = args;

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: ids }, client_id },
	});

	if (floors.length === 0) {
		throw new APIError("Floors not found", "hospitality.floor.suspend.NOT_FOUND", undefined, 404);
	}

	const toSuspend = floors.filter((f) => f.status !== "suspended");

	if (toSuspend.length === 0 && resource_status === "suspend") {
		throw new APIError(
			"All selected floors are already suspended",
			"hospitality.floor.suspend.ALREADY_SUSPENDED",
			undefined,
			409,
		);
	}

	if (destination_floor_id) {
		if (ids.includes(destination_floor_id)) {
			throw new APIError("Self-reassignment target is not allowed", undefined, undefined, 400);
		}

		const destFloor = await prisma.vertical_hospitality_floor.findUnique({
			where: { id: destination_floor_id, client_id },
		});

		if (!destFloor) {
			throw new APIError("Destination floor not found", undefined, undefined, 404);
		}
	}

	// Get boxes on the target floors
	const floorBoxes = await prisma.vertical_hospitality_floor_box.findMany({
		where: { floor_id: { in: ids } },
		select: { box_id: true },
	});
	const boxIds = floorBoxes.map((fb) => fb.box_id);

	await prisma.$transaction(async (tx) => {
		// Suspend the floors
		await tx.vertical_hospitality_floor.updateMany({
			where: {
				id: { in: ids },
				client_id,
			},
			data: {
				status: "suspended",
			},
		});

		if (resource_status === "suspend") {
			// Suspend the boxes
			if (boxIds.length > 0) {
				await tx.box.updateMany({
					where: { id: { in: boxIds }, client_id },
					data: { status: "suspended" },
				});
			}
		} else if (resource_status === "assign") {
			if (destination_floor_id) {
				// Delete destination mappings if duplicates
				await tx.vertical_hospitality_floor_box.deleteMany({
					where: {
						box_id: { in: boxIds },
						floor_id: destination_floor_id,
					},
				});
				// Reassign mappings
				await tx.vertical_hospitality_floor_box.updateMany({
					where: { floor_id: { in: ids } },
					data: { floor_id: destination_floor_id },
				});
			} else {
				// Unassign mappings
				await tx.vertical_hospitality_floor_box.deleteMany({
					where: { floor_id: { in: ids } },
				});
			}
		}
	});

	return { suspended_count: toSuspend.length || ids.length };
};

interface ReactivateFloorsArgs {
	ids: string[];
	client_id: string;
	reactivate_boxes?: boolean;
}

export const reactivateFloors = async (args: ReactivateFloorsArgs) => {
	const { ids, client_id, reactivate_boxes } = args;

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: ids }, client_id, status: "suspended" },
	});

	if (floors.length === 0) {
		throw new APIError("No suspended floors found to reactivate", "hospitality.floor.reactivate.NOT_FOUND", undefined, 404);
	}

	const floorIds = floors.map((f) => f.id);

	// Get boxes on the target floors
	const floorBoxes = await prisma.vertical_hospitality_floor_box.findMany({
		where: { floor_id: { in: floorIds } },
		select: { box_id: true },
	});
	const boxIds = floorBoxes.map((fb) => fb.box_id);

	await prisma.$transaction(async (tx) => {
		// Reactivate the floors
		await tx.vertical_hospitality_floor.updateMany({
			where: {
				id: { in: floorIds },
				client_id,
			},
			data: {
				status: "active",
			},
		});

		if (reactivate_boxes && boxIds.length > 0) {
			// Reactivate the suspended boxes
			await tx.box.updateMany({
				where: { id: { in: boxIds }, client_id, status: "suspended" },
				data: { status: "active" },
			});
		}
	});

	return { reactivated_count: floors.length };
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
