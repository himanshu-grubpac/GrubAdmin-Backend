import { APIError } from "@/types/error";
import { prisma } from "..";
import type { Prisma } from "../types";
import { Prisma as PrismaClient } from "@/db/prisma";
import { PAGE_SIZE } from "@/configs/constants";
import { MAX_PAGE_SIZE } from "@/validators/pagination";
import { hospitalityPrefixStringFilter } from "@/modules/hospitality/utils/hospitality-search";

/** Preview cap per floor when include_boxes=true — full inventory uses floor resources API. */
const FLOOR_LIST_BOXES_PREVIEW_LIMIT = 200;

const throwDuplicateFloorNameError = (operation: "create" | "update") => {
	throw new APIError(
		"A floor with this name already exists under your account.",
		operation === "create"
			? "hospitality.floor.create.DUPLICATE_NAME"
			: "hospitality.floor.update.DUPLICATE_NAME",
		undefined,
		409,
	);
};

const isDuplicateFloorNameError = (error: unknown) =>
	error instanceof PrismaClient.PrismaClientKnownRequestError &&
	error.code === "P2002";

interface CreateFloorArgs {
	name: string;
	client_id: string;
	status?: "active" | "suspended";
}

export const createFloor = async (args: CreateFloorArgs) => {
	const { name, client_id, status } = args;

	// DB @@unique([client_id, name]) spans all statuses — not only active floors.
	const existingByName = await prisma.vertical_hospitality_floor.findFirst({
		where: {
			name,
			client_id,
		},
	});
	if (existingByName) {
		throwDuplicateFloorNameError("create");
	}

	try {
		return await prisma.vertical_hospitality_floor.create({
			data: {
				name,
				client_id,
				status,
			},
		});
	} catch (error) {
		if (isDuplicateFloorNameError(error)) {
			throwDuplicateFloorNameError("create");
		}
		throw error;
	}
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

export type HospitalityFloorBoxSummary = {
	id: string;
	room: string | null;
	box_display_id: string | null;
};

export type HospitalityFloorListItem = {
	id: string;
	name: string;
	status: string;
	created_at: Date;
	updated_at: Date;
	/** Total assigned boxes for this floor (status-aware per list context). */
	box_count: number;
	/** Same as box_count when include_boxes=true — explicit total vs preview list length (G27). */
	boxes_total_count?: number;
	/** Length of boxes_list preview when include_boxes=true (may be less than boxes_total_count). */
	boxes_preview_count?: number;
	boxes_list?: HospitalityFloorBoxSummary[];
};

/** Box status filter for floor assignment counts — aligned with list context (G28 / C9). */
export const resolveAssignedBoxCountWhere = (
	listStatus?: "active" | "suspended" | "all",
): Prisma.vertical_hospitality_floor_boxWhereInput | undefined => {
	if (listStatus === "suspended") {
		return { box: { status: "suspended" } };
	}
	if (listStatus === "all") {
		return undefined;
	}
	return { box: { status: "active" } };
};

type FloorListRow = {
	id: string;
	name: string;
	status: string;
	created_at: Date;
	updated_at: Date;
	_count?: { boxes: number };
	boxes?: Array<{
		room: string | null;
		box: { id: string; box_display_id: string | null };
	}>;
};

export const mapHospitalityFloorListItem = (
	floor: FloorListRow,
	include_boxes: boolean,
): HospitalityFloorListItem => {
	const totalBoxCount = floor._count?.boxes ?? 0;
	const item: HospitalityFloorListItem = {
		id: floor.id,
		name: floor.name,
		status: floor.status,
		created_at: floor.created_at,
		updated_at: floor.updated_at,
		box_count: totalBoxCount,
	};

	if (include_boxes) {
		item.boxes_total_count = totalBoxCount;
		if (floor.boxes) {
			item.boxes_list = floor.boxes.map((assignment) => ({
				id: assignment.box.id,
				room: assignment.room ?? null,
				box_display_id: assignment.box.box_display_id ?? null,
			}));
			item.boxes_preview_count = floor.boxes.length;
		} else {
			item.boxes_preview_count = 0;
		}
	}

	return item;
};

interface GetFloorsArgs {
	query?: string;
	status?: "active" | "suspended" | "all";
	page_size?: number;
	page_number?: number;
	client_id: string;
	fetch_all?: boolean;
	include_boxes?: boolean;
}

export const getFloors = async (args: GetFloorsArgs) => {
	const {
		query,
		status,
		page_size,
		page_number,
		client_id,
		fetch_all,
		include_boxes = false,
	} = args;

	const assignedBoxCountWhere = resolveAssignedBoxCountWhere(status);
	const safePageSize = fetch_all
		? undefined
		: Math.min(page_size ?? PAGE_SIZE, MAX_PAGE_SIZE);
	const safePageNumber = Math.max(page_number ?? 1, 1);

	const floorsQuery: Prisma.vertical_hospitality_floorFindManyArgs = {
		where: {
			client_id,
			status: status === "all" ? undefined : (status || { not: "suspended" }),
			name: hospitalityPrefixStringFilter(query),
		},
		include: {
			_count: {
				select: {
					boxes: {
						where: assignedBoxCountWhere,
					},
				},
			},
			...(include_boxes
				? {
						boxes: {
							where: assignedBoxCountWhere,
							take: FLOOR_LIST_BOXES_PREVIEW_LIMIT,
							select: {
								room: true,
								box: {
									select: {
										id: true,
										box_display_id: true,
									},
								},
							},
						},
					}
				: {}),
		},
		skip:
			!fetch_all && safePageSize
				? (safePageNumber - 1) * safePageSize
				: undefined,
		take: safePageSize,
	};

	const [floors, count] = await Promise.all([
		prisma.vertical_hospitality_floor.findMany(floorsQuery),
		prisma.vertical_hospitality_floor.count({
			where: floorsQuery.where,
		}),
	]);

	return {
		floors: floors.map((floor) =>
			mapHospitalityFloorListItem(floor as FloorListRow, include_boxes),
		),
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
				id: { not: id },
			},
		});
		if (existingByName) {
			throwDuplicateFloorNameError("update");
		}
	}

	try {
		return await prisma.vertical_hospitality_floor.update({
			where: { id, client_id },
			data: {
				name,
				status,
			},
		});
	} catch (error) {
		if (isDuplicateFloorNameError(error)) {
			throwDuplicateFloorNameError("update");
		}
		throw error;
	}
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

	if (floors.length !== ids.length) {
		throw new APIError(
			"Some floors were not found or access denied",
			"hospitality.floor.suspend.PARTIAL_FOUND",
			undefined,
			409,
		);
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
					? undefined
					: (status as "active" | "suspended"),
			name: hospitalityPrefixStringFilter(query),
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
