import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { BoxConfig } from "@/db/mongo-schema";
import type { Prisma } from "@/db/types";
import { calculatePagination } from "@/utils/pagination.ts";
import {
	buildHospitalityBoxSearchOr,
	HOSPITALITY_SEARCH_QUERY_MAX,
} from "@/modules/hospitality/utils/hospitality-search";
import {
	buildHospitalityMemoKey,
	hospitalityRequestMemo,
} from "@/modules/hospitality/utils/hospitality-request-memo";

const DEFAULT_LIST_LIMIT = 50;
const MAX_GROUP_KEYS = 100;
const DROPDOWN_OPTION_LIMIT = 500;
/** @deprecated use {@link HOSPITALITY_SEARCH_QUERY_MAX} */
const SEARCH_QUERY_MAX = HOSPITALITY_SEARCH_QUERY_MAX;
/** Server-side bulk reactivate batch size (cursor loop). */
const BULK_REACTIVATE_BATCH_SIZE = 500;
/** Cap for ids_only list queries (FloorResources select-all — G30). */
export const HOSPITALITY_MATCHING_BOX_IDS_CAP = 500;

const HOSPITALITY_BOX_LIST_SELECT = {
	id: true,
	name: true,
	box_display_id: true,
	status: true,
	created_at: true,
	updated_at: true,
	vertical_id: true,
	telemetry: {
		select: {
			power_status: true,
			health_status: true,
			ioniser_status: true,
			dual_zone_status: true,
			zone1_temp: true,
			zone2_temp: true,
			zone1_target_temp: true,
			zone2_target_temp: true,
			battery_percentage: true,
			connection_status: true,
		},
	},
	lock: {
		select: { lock_status: true },
	},
	hospitality_floor_boxes: {
		select: {
			room: true,
			floor: { select: { id: true, name: true } },
		},
		take: 1,
		orderBy: { created_at: "desc" as const },
	},
	hospitality_connection_employee: {
		select: {
			first_name: true,
			last_name: true,
			mobile_number: true,
			country_code: true,
		},
	},
} as const satisfies Prisma.boxSelect;

type HospitalityBoxListRow = Prisma.boxGetPayload<{
	select: typeof HOSPITALITY_BOX_LIST_SELECT;
}>;

const sanitizeHospitalityBox = (box: any) => {
	if (!box) return box;
	const {
		vehicle_number,
		connection_employee_id,
		medical_connection_employee_id,
		connection_employee,
		medical_connection_employee,
		...sanitizedBox
	} = box;
	return sanitizedBox;
};

export const mapHospitalityListBox = (box: HospitalityBoxListRow) => {
	const floorBox = box.hospitality_floor_boxes[0];
	const floor = floorBox?.floor ?? null;
	const guest = box.hospitality_connection_employee;
	const guestName = guest
		? `${guest.first_name} ${guest.last_name || ""}`.trim()
		: "";
	const guestPhone = guest
		? `${guest.country_code || ""}${guest.mobile_number || ""}`.trim()
		: "";
	const powerStatus = box.telemetry?.power_status || "off";
	const lockStatus = box.lock?.lock_status || "unlocked";

	return {
		id: box.id,
		name: box.name,
		box_display_id: box.box_display_id,
		box_id: box.box_display_id,
		status: box.status,
		created_at: box.created_at,
		updated_at: box.updated_at,
		power_status: powerStatus,
		grublock_status: lockStatus,
		has_lock: box.lock != null && lockStatus !== "not_available",
		floor_id: floor?.id ?? null,
		floor_name: floor?.name ?? "",
		room: floorBox?.room ?? "",
		guest_name: guestName || null,
		guest_phone: guestPhone || null,
		telemetry: box.telemetry
			? {
					power_status: box.telemetry.power_status,
					health_status: box.telemetry.health_status,
					ioniser_status: box.telemetry.ioniser_status,
					dual_zone_status: box.telemetry.dual_zone_status,
					zone1_temp: box.telemetry.zone1_temp,
					zone2_temp: box.telemetry.zone2_temp,
					zone1_target_temp: box.telemetry.zone1_target_temp,
					zone2_target_temp: box.telemetry.zone2_target_temp,
					battery_percentage: box.telemetry.battery_percentage,
					connection_status: box.telemetry.connection_status,
				}
			: null,
		hospitality_floor_boxes: floor
			? [{ room: floorBox?.room ?? null, floor: { id: floor.id, name: floor.name } }]
			: [],
	};
};

interface GetHospitalityBoxesArgs {
	page?: number;
	limit?: number;
	query?: string;
	status?: "active" | "suspended";
	floor_id?: string | null;
	client_id: string;
	vertical_id?: string;
	group_by?: "lock_status" | "power_status" | "floors";
	group_by_selected_table?: string;
	connection_status?: string;
	power_status?: string;
	health_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	floor_assigned?: "on" | "off";
	room_assigned?: "on" | "off";
	zone1_min?: number;
	zone1_max?: number;
	zone2_min?: number;
	zone2_max?: number;
	ext_min?: number;
	ext_max?: number;
}

const resolveListPage = (page?: number) => (page && page > 0 ? page : 1);
const resolveListLimit = (limit?: number) =>
	limit && limit > 0 ? Math.min(limit, 100) : DEFAULT_LIST_LIMIT;

const buildHospitalityBoxWhere = (
	args: GetHospitalityBoxesArgs,
): Prisma.boxWhereInput => {
	const {
		query,
		status,
		floor_id,
		client_id,
		vertical_id,
		connection_status,
		power_status,
		health_status,
		ioniser_status,
		dual_zone_status,
		floor_assigned,
		room_assigned,
		zone1_min,
		zone1_max,
		zone2_min,
		zone2_max,
		ext_min,
		ext_max,
	} = args;

	const where: Prisma.boxWhereInput = {
		client_id,
		...(vertical_id ? { vertical_id } : {}),
	};

	if (status) {
		where.status = status;
	}

	const boxSearchOr = buildHospitalityBoxSearchOr(query);
	if (boxSearchOr) {
		where.OR = boxSearchOr;
	}

	const telemetryFilter: Prisma.box_telemetry_latestWhereInput = {};
	if (connection_status) telemetryFilter.connection_status = connection_status as Prisma.box_telemetry_latestWhereInput["connection_status"];
	if (health_status) telemetryFilter.health_status = health_status as Prisma.box_telemetry_latestWhereInput["health_status"];
	if (ioniser_status) telemetryFilter.ioniser_status = ioniser_status as Prisma.box_telemetry_latestWhereInput["ioniser_status"];
	if (dual_zone_status) telemetryFilter.dual_zone_status = dual_zone_status as Prisma.box_telemetry_latestWhereInput["dual_zone_status"];

	if (power_status && power_status !== "offline" && power_status !== "unknown") {
		telemetryFilter.power_status = power_status as Prisma.box_telemetry_latestWhereInput["power_status"];
	}

	if (zone1_min !== undefined || zone1_max !== undefined) {
		telemetryFilter.zone1_temp = {
			...(zone1_min !== undefined ? { gte: zone1_min } : {}),
			...(zone1_max !== undefined ? { lte: zone1_max } : {}),
		};
	}
	if (zone2_min !== undefined || zone2_max !== undefined) {
		telemetryFilter.zone2_temp = {
			...(zone2_min !== undefined ? { gte: zone2_min } : {}),
			...(zone2_max !== undefined ? { lte: zone2_max } : {}),
		};
	}
	if (ext_min !== undefined || ext_max !== undefined) {
		telemetryFilter.ext_temp = {
			...(ext_min !== undefined ? { gte: ext_min } : {}),
			...(ext_max !== undefined ? { lte: ext_max } : {}),
		};
	}

	const extraAnd: Prisma.boxWhereInput[] = [];

	if (Object.keys(telemetryFilter).length > 0) {
		where.telemetry = telemetryFilter;
	}

	if (power_status === "offline") {
		extraAnd.push({
			OR: [
				{ telemetry: { power_status: { in: ["off", "unknown"] } } },
				{ telemetry: { is: null } },
			],
		});
	} else if (power_status === "unknown") {
		extraAnd.push({
			OR: [
				{ telemetry: { power_status: "unknown" } },
				{ telemetry: { is: null } },
			],
		});
	}

	if (floor_id) {
		extraAnd.push({
			hospitality_floor_boxes: { some: { floor_id } },
		});
	} else if (floor_assigned === "on") {
		extraAnd.push({
			hospitality_floor_boxes: { some: {} },
		});
	} else if (floor_assigned === "off") {
		extraAnd.push({
			hospitality_floor_boxes: { none: {} },
		});
	}

	if (room_assigned === "on") {
		extraAnd.push({
			hospitality_floor_boxes: {
				some: {
					AND: [{ room: { not: null } }, { room: { not: "" } }],
				},
			},
		});
	} else if (room_assigned === "off") {
		extraAnd.push({
			OR: [
				{ hospitality_floor_boxes: { none: {} } },
				{
					hospitality_floor_boxes: {
						every: {
							OR: [{ room: null }, { room: "" }],
						},
					},
				},
			],
		});
	}

	if (extraAnd.length > 0) {
		where.AND = extraAnd;
	}

	return where;
};

const findHospitalityListPage = async (
	where: Prisma.boxWhereInput,
	page: number,
	limit: number,
) => {
	const skip = (page - 1) * limit;
	const [rows, count] = await Promise.all([
		prisma.box.findMany({
			where,
			skip,
			take: limit,
			orderBy: { created_at: "desc" },
			select: HOSPITALITY_BOX_LIST_SELECT,
		}),
		prisma.box.count({ where }),
	]);

	return {
		boxes: rows.map(mapHospitalityListBox),
		count,
		pagination: calculatePagination(page, limit, count),
	};
};

const powerGroupWhere = (
	base: Prisma.boxWhereInput,
	key: string,
): Prisma.boxWhereInput => {
	if (key === "on" || key === "off") {
		return {
			AND: [base, { telemetry: { power_status: key } }],
		};
	}
	return {
		AND: [
			base,
			{
				OR: [
					{ telemetry: { power_status: "unknown" } },
					{ telemetry: { is: null } },
				],
			},
		],
	};
};

const lockGroupWhere = (
	base: Prisma.boxWhereInput,
	key: string,
): Prisma.boxWhereInput => {
	if (key === "unlocked") {
		return {
			AND: [
				base,
				{
					OR: [
						{ lock: { is: null } },
						{ lock: { lock_status: "unlocked" } },
					],
				},
			],
		};
	}
	return {
		AND: [base, { lock: { lock_status: key as Prisma.box_lockWhereInput["lock_status"] } }],
	};
};

export const getHospitalityBoxes = async (args: GetHospitalityBoxesArgs) => {
	const page = resolveListPage(args.page);
	const limit = resolveListLimit(args.limit);
	const where = buildHospitalityBoxWhere(args);

	if (!args.group_by) {
		const result = await findHospitalityListPage(where, page, limit);
		return {
			boxes: result.boxes,
			count: result.count,
			total_count: result.count,
			page,
			limit,
			pagination: result.pagination,
			groups: undefined as undefined,
		};
	}

	if (args.group_by === "power_status") {
		const requested = args.group_by_selected_table;
		const keys = requested ? [requested] : ["on", "off", "unknown"];
		const groups: Record<string, { boxes: ReturnType<typeof mapHospitalityListBox>[]; count: number; pagination: ReturnType<typeof calculatePagination> }> = {};
		let total_count = 0;

		await Promise.all(
			keys.map(async (key) => {
				const result = await findHospitalityListPage(powerGroupWhere(where, key), page, limit);
				total_count += result.count;
				if (result.count > 0 || requested) {
					groups[key] = {
						boxes: result.boxes,
						count: result.count,
						pagination: result.pagination,
					};
				}
			}),
		);

		return { boxes: [] as ReturnType<typeof mapHospitalityListBox>[], count: total_count, total_count, page, limit, groups };
	}

	if (args.group_by === "lock_status") {
		const requested = args.group_by_selected_table;
		const keys = requested ? [requested] : ["locked", "unlocked", "offline", "not_available"];
		const groups: Record<string, { boxes: ReturnType<typeof mapHospitalityListBox>[]; count: number; pagination: ReturnType<typeof calculatePagination> }> = {};
		let total_count = 0;

		await Promise.all(
			keys.map(async (key) => {
				const result = await findHospitalityListPage(lockGroupWhere(where, key), page, limit);
				total_count += result.count;
				if (result.count > 0 || requested) {
					groups[key] = {
						boxes: result.boxes,
						count: result.count,
						pagination: result.pagination,
					};
				}
			}),
		);

		return { boxes: [] as ReturnType<typeof mapHospitalityListBox>[], count: total_count, total_count, page, limit, groups };
	}

	const requestedFloor = args.group_by_selected_table;
	const groups: Record<
		string,
		{
			boxes: ReturnType<typeof mapHospitalityListBox>[];
			count: number;
			pagination: ReturnType<typeof calculatePagination>;
			floor_name?: string;
			name?: string;
		}
	> = {};
	let total_count = 0;

	if (requestedFloor && requestedFloor !== "unassigned") {
		const floor = await prisma.vertical_hospitality_floor.findFirst({
			where: { id: requestedFloor, client_id: args.client_id },
			select: { id: true, name: true },
		});
		const result = await findHospitalityListPage(
			{
				AND: [where, { hospitality_floor_boxes: { some: { floor_id: requestedFloor } } }],
			},
			page,
			limit,
		);
		groups[requestedFloor] = {
			boxes: result.boxes,
			count: result.count,
			pagination: result.pagination,
			floor_name: floor?.name ?? "Unassigned",
			name: floor?.name ?? "Unassigned",
		};
		return { boxes: [] as ReturnType<typeof mapHospitalityListBox>[], count: result.count, total_count: result.count, page, limit, groups };
	}

	if (requestedFloor === "unassigned") {
		const result = await findHospitalityListPage(
			{
				AND: [where, { hospitality_floor_boxes: { none: {} } }],
			},
			page,
			limit,
		);
		groups.unassigned = {
			boxes: result.boxes,
			count: result.count,
			pagination: result.pagination,
			floor_name: "Unassigned",
			name: "Unassigned",
		};
		return { boxes: [] as ReturnType<typeof mapHospitalityListBox>[], count: result.count, total_count: result.count, page, limit, groups };
	}

	const floorCounts = await prisma.vertical_hospitality_floor_box.groupBy({
		by: ["floor_id"],
		where: {
			floor: { client_id: args.client_id },
			box: where,
		},
		_count: { _all: true },
	});

	const sortedFloorCounts = [...floorCounts]
		.sort((a, b) => b._count._all - a._count._all)
		.slice(0, MAX_GROUP_KEYS);

	const floorIds = sortedFloorCounts.map((row) => row.floor_id);
	const floors = floorIds.length
		? await prisma.vertical_hospitality_floor.findMany({
				where: { id: { in: floorIds }, client_id: args.client_id },
				select: { id: true, name: true },
			})
		: [];
	const floorNameById = new Map(floors.map((floor) => [floor.id, floor.name]));

	await Promise.all(
		sortedFloorCounts.map(async (row) => {
			const result = await findHospitalityListPage(
				{
					AND: [where, { hospitality_floor_boxes: { some: { floor_id: row.floor_id } } }],
				},
				page,
				limit,
			);
			const floorName = floorNameById.get(row.floor_id) ?? row.floor_id;
			total_count += row._count._all;
			groups[row.floor_id] = {
				boxes: result.boxes,
				count: row._count._all,
				pagination: calculatePagination(page, limit, row._count._all),
				floor_name: floorName,
				name: floorName,
			};
		}),
	);

	if (args.floor_assigned !== "on" && args.floor_id == null) {
		const unassigned = await findHospitalityListPage(
			{
				AND: [where, { hospitality_floor_boxes: { none: {} } }],
			},
			page,
			limit,
		);
		if (unassigned.count > 0) {
			total_count += unassigned.count;
			groups.unassigned = {
				boxes: unassigned.boxes,
				count: unassigned.count,
				pagination: unassigned.pagination,
				floor_name: "Unassigned",
				name: "Unassigned",
			};
		}
	}

	return { boxes: [] as ReturnType<typeof mapHospitalityListBox>[], count: total_count, total_count, page, limit, groups };
};

interface GetHospitalityBoxDetailsArgs {
	id: string;
	client_id: string;
}

export const getHospitalityBoxDetails = async (args: GetHospitalityBoxDetailsArgs) => {
	const { id, client_id } = args;

	const box = await prisma.box.findFirst({
		where: { id, client_id },
		include: {
			telemetry: true,
			lock: {
				select: { lock_status: true },
			},
			hospitality_connection_employee: {
				select: {
					first_name: true,
					last_name: true,
					mobile_number: true,
					country_code: true,
				},
			},
			hospitality_floor_boxes: {
				include: {
					floor: {
						select: { id: true, name: true },
					},
				},
				take: 1,
				orderBy: { created_at: "desc" },
			},
		},
	});

	if (!box) {
		throw new APIError(undefined, "hospitality.box.NOT_FOUND", undefined, 404);
	}

	const sanitized = sanitizeHospitalityBox(box);
	const floorBox = box.hospitality_floor_boxes[0];
	const floor = floorBox?.floor ?? null;
	const guest = box.hospitality_connection_employee;
	const guestName = guest
		? `${guest.first_name} ${guest.last_name || ""}`.trim()
		: "";
	const guestPhone = guest
		? `${guest.country_code || ""}${guest.mobile_number || ""}`.trim()
		: "";
	const lockStatus = box.lock?.lock_status || "unlocked";

	return {
		...sanitized,
		grublock_status: lockStatus,
		has_lock: box.lock != null && lockStatus !== "not_available",
		floor_id: floor?.id ?? null,
		floor_name: floor?.name ?? "",
		room: floorBox?.room ?? "",
		guest_name: guestName || null,
		guest_phone: guestPhone || null,
	};
};

interface SearchHospitalityBoxesArgs {
	query?: string;
	client_id: string;
	vertical_id?: string;
	limit?: number;
	status?: "active" | "suspended";
}

export const searchHospitalityBoxes = async (args: SearchHospitalityBoxesArgs) => {
	const { query, client_id, vertical_id, limit = DEFAULT_LIST_LIMIT, status } = args;
	const boxSearchOr = buildHospitalityBoxSearchOr(query);
	const take = resolveListLimit(limit);

	const rows = await prisma.box.findMany({
		where: {
			client_id,
			...(vertical_id ? { vertical_id } : {}),
			status: status || { not: "suspended" },
			OR: boxSearchOr,
		},
		select: HOSPITALITY_BOX_LIST_SELECT,
		orderBy: { created_at: "desc" },
		take,
	});

	return rows.map(mapHospitalityListBox);
};

export const getHospitalityGrubpacDropdowns = async (
	client_id: string,
	vertical_id?: string,
) => {
	const memoKey = buildHospitalityMemoKey("grubpac-dropdowns", client_id, vertical_id);
	return hospitalityRequestMemo.getOrLoad(memoKey, async () => {
		return loadHospitalityGrubpacDropdowns(client_id, vertical_id);
	});
};

const loadHospitalityGrubpacDropdowns = async (
	client_id: string,
	vertical_id?: string,
) => {
	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { client_id, status: "active" },
		select: {
			id: true,
			name: true,
			created_at: true,
			updated_at: true,
			_count: {
				select: {
					boxes: {
						where: {
							box: {
								status: "active",
								...(vertical_id ? { vertical_id } : {}),
							},
						},
					},
				},
			},
		},
		orderBy: { name: "asc" },
		take: DROPDOWN_OPTION_LIMIT,
	});

	return {
		floors: floors.map((floor) => ({
			id: floor.id,
			name: floor.name,
			box_count: floor._count.boxes,
			created_at: floor.created_at,
			updated_at: floor.updated_at,
		})),
	};
};

interface ToggleSuspendHospitalityBoxesArgs {
	ids: string[];
	client_id: string;
	state: "active" | "suspended";
	reassign?: boolean;
}

export const toggleSuspendHospitalityBoxes = async (
	args: ToggleSuspendHospitalityBoxesArgs,
) => {
	const boxes = await prisma.box.findMany({
		where: { id: { in: args.ids }, client_id: args.client_id },
		select: { id: true, status: true },
	});

	if (boxes.length !== args.ids.length) {
		throw new APIError(
			"One or more boxes were not found for this client.",
			undefined,
			undefined,
			404,
		);
	}

	if (boxes.length === 0) {
		throw new APIError("No boxes found", undefined, { ids: args.ids }, 404);
	}

	const alreadyInState = boxes.filter((b) => b.status === args.state);
	const toUpdate = boxes.filter((b) => b.status !== args.state);

	if (toUpdate.length > 0) {
		await prisma.$transaction(async (tx) => {
			if (args.state === "active" && args.reassign === false) {
				await tx.vertical_hospitality_floor_box.deleteMany({
					where: { box_id: { in: toUpdate.map((b) => b.id) } },
				});
			}
			await tx.box.updateMany({
				where: { id: { in: toUpdate.map((b) => b.id) } },
				data: { status: args.state },
			});
		});
	}

	return {
		updated_count: toUpdate.length,
		already_in_state_count: alreadyInState.length,
		not_found_count: args.ids.length - boxes.length,
	};
};

export interface BulkReactivateHospitalityBoxesFilterArgs {
	client_id: string;
	vertical_id?: string;
	reassign?: boolean;
	query?: string;
	floor_assigned?: "on" | "off";
	room_assigned?: "on" | "off";
}

export type GetHospitalityBoxIdsFilterArgs = Pick<
	GetHospitalityBoxesArgs,
	| "client_id"
	| "vertical_id"
	| "status"
	| "query"
	| "floor_id"
	| "connection_status"
	| "power_status"
	| "health_status"
	| "ioniser_status"
	| "dual_zone_status"
	| "floor_assigned"
	| "room_assigned"
	| "zone1_min"
	| "zone1_max"
	| "zone2_min"
	| "zone2_max"
	| "ext_min"
	| "ext_max"
>;

/** Return up to {@link HOSPITALITY_MATCHING_BOX_IDS_CAP} box ids matching list filters (G30). */
export const getHospitalityBoxIdsByFilter = async (
	args: GetHospitalityBoxIdsFilterArgs,
) => {
	const where = buildHospitalityBoxWhere(args);
	const [total_count, rows] = await Promise.all([
		prisma.box.count({ where }),
		prisma.box.findMany({
			where,
			select: { id: true },
			orderBy: { created_at: "desc" },
			take: HOSPITALITY_MATCHING_BOX_IDS_CAP,
		}),
	]);

	return {
		ids: rows.map((row) => row.id),
		total_count,
		truncated: total_count > rows.length,
	};
};

/** Reactivate all suspended boxes matching list filters — server-side batched updateMany (G29). */
export const bulkReactivateHospitalityBoxesByFilter = async (
	args: BulkReactivateHospitalityBoxesFilterArgs,
) => {
	const where = buildHospitalityBoxWhere({
		client_id: args.client_id,
		vertical_id: args.vertical_id,
		status: "suspended",
		query: args.query,
		floor_assigned: args.floor_assigned,
		room_assigned: args.room_assigned,
	});

	let updated_count = 0;
	let cursor: string | undefined;

	while (true) {
		const batch = await prisma.box.findMany({
			where: {
				...where,
				status: "suspended",
				...(cursor ? { id: { gt: cursor } } : {}),
			},
			select: { id: true },
			orderBy: { id: "asc" },
			take: BULK_REACTIVATE_BATCH_SIZE,
		});

		if (batch.length === 0) {
			break;
		}

		const ids = batch.map((box) => box.id);

		await prisma.$transaction(async (tx) => {
			if (args.reassign === false) {
				await tx.vertical_hospitality_floor_box.deleteMany({
					where: { box_id: { in: ids } },
				});
			}
			await tx.box.updateMany({
				where: {
					id: { in: ids },
					client_id: args.client_id,
					status: "suspended",
				},
				data: { status: "active" },
			});
		});

		updated_count += ids.length;
		cursor = batch[batch.length - 1]!.id;

		if (batch.length < BULK_REACTIVATE_BATCH_SIZE) {
			break;
		}
	}

	return {
		updated_count,
		already_in_state_count: 0,
	};
};

interface DeleteHospitalityBoxesArgs {
	ids: string[];
	client_id: string;
}

export const deleteHospitalityBoxes = async (args: DeleteHospitalityBoxesArgs) => {
	const { ids, client_id } = args;

	const ownedBoxes = await prisma.box.findMany({
		where: { id: { in: ids }, client_id },
		select: { id: true },
	});
	const ownedIds = ownedBoxes.map((box) => box.id);

	if (ownedIds.length !== ids.length) {
		throw new APIError(
			"One or more boxes were not found for this client.",
			undefined,
			undefined,
			404,
		);
	}

	await prisma.$transaction(async (tx) => {
		await tx.vertical_hospitality_floor_box.deleteMany({
			where: { box_id: { in: ownedIds } },
		});

		await tx.box.deleteMany({
			where: { id: { in: ownedIds }, client_id },
		});
	});

	try {
		await BoxConfig.deleteMany({ box_id: { $in: ownedIds } });
	} catch (error) {
		console.error("Failed to delete Mongo BoxConfig for hospitality boxes:", error);
	}

	return { deleted_count: ownedIds.length };
};

interface ReassignBoxesToFloorArgs {
	box_ids: string[];
	destination_floor_id: string | null;
	room?: string | null;
	client_id: string;
}

export const reassignBoxesToFloor = async (
	args: ReassignBoxesToFloorArgs,
) => {
	const { box_ids, destination_floor_id, room, client_id } = args;

	const boxes = await prisma.box.findMany({
		where: { id: { in: box_ids }, client_id },
		select: { id: true },
	});

	if (boxes.length !== box_ids.length) {
		throw new APIError(
			"One or more boxes were not found for this client.",
			undefined,
			undefined,
			404,
		);
	}

	const ownedIds = boxes.map((box) => box.id);

	await prisma.$transaction(async (tx) => {
		await tx.vertical_hospitality_floor_box.deleteMany({
			where: { box_id: { in: ownedIds } },
		});

		if (destination_floor_id) {
			const floor = await tx.vertical_hospitality_floor.findUnique({
				where: { id: destination_floor_id, client_id },
			});

			if (!floor) {
				throw new APIError("Destination floor not found", undefined, undefined, 404);
			}

			if (floor.status !== "active") {
				throw new APIError(
					"Cannot assign boxes to a suspended floor.",
					undefined,
					undefined,
					409,
				);
			}

			await tx.vertical_hospitality_floor_box.createMany({
				data: ownedIds.map((box_id) => ({
					box_id,
					floor_id: destination_floor_id,
					room: room || null,
				})),
			});
		}
	});

	return { updated_count: ownedIds.length };
};

interface ActionHospitalityBoxesArgs {
	ids: string[];
	client_id: string;
	status?: "active" | "suspended";
	power_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	zone1_temp?: number;
	zone2_temp?: number;
	ext_temp?: number;
	assign_floor_id?: string | null;
	room?: string | null;
	adas_status?: string;
	bluetooth_status?: string;
	camera_status?: string;
	gps_status?: string;
	gyrosensor_status?: string;
	save_to_memory_status?: string;
	sim_status?: string;
	solar_status?: string;
	wifi_status?: string;
	turn_signal_status?: string;
	advert_screen_status?: string;
	port_small_status?: string;
	port_big_status?: string;
}

export const actionHospitalityBoxes = async (args: ActionHospitalityBoxesArgs) => {
	const {
		ids,
		client_id,
		status,
		assign_floor_id,
		room,
		...telemetryFields
	} = args;

	const boxes = await prisma.box.findMany({
		where: { id: { in: ids }, client_id },
		select: { id: true, name: true, box_display_id: true, vertical_id: true },
	});

	if (boxes.length !== ids.length) {
		throw new APIError("No boxes found", undefined, undefined, 404);
	}

	const foundIds = boxes.map((b) => b.id);
	const telemetryUpdate: any = {};

	await prisma.$transaction(async (tx) => {
		if (status) {
			await tx.box.updateMany({
				where: { id: { in: foundIds } },
				data: { status },
			});
		}

		if (assign_floor_id !== undefined) {
			await tx.vertical_hospitality_floor_box.deleteMany({
				where: { box_id: { in: foundIds } },
			});

			if (assign_floor_id) {
				const floor = await tx.vertical_hospitality_floor.findUnique({
					where: { id: assign_floor_id, client_id },
				});

				if (!floor) {
					throw new APIError("Floor not found", undefined, undefined, 404);
				}

				if (floor.status !== "active") {
					throw new APIError(
						"Cannot assign boxes to a suspended floor.",
						undefined,
						undefined,
						409,
					);
				}

				await tx.vertical_hospitality_floor_box.createMany({
					data: foundIds.map((box_id) => ({
						box_id,
						floor_id: assign_floor_id,
						room: room ?? null,
					})),
				});
			}
		} else if (room !== undefined) {
			await tx.vertical_hospitality_floor_box.updateMany({
				where: { box_id: { in: foundIds } },
				data: { room: room ?? null },
			});
		}

		const commandConfigFields = [
			"power_status",
			"ioniser_status",
			"dual_zone_status",
			"zone1_temp",
			"zone2_temp",
			"camera_status",
			"advert_screen_status",
		];

		for (const field of commandConfigFields) {
			if ((telemetryFields as any)[field] !== undefined) {
				if (field === "zone1_temp") {
					telemetryUpdate.zone1_target_temp = (telemetryFields as any)[field];
				} else if (field === "zone2_temp") {
					telemetryUpdate.zone2_target_temp = (telemetryFields as any)[field];
				} else {
					telemetryUpdate[field] = (telemetryFields as any)[field];
				}
			}
		}

		const prismaTelemetryUpdate: Record<string, unknown> = {};
		if (telemetryFields.power_status !== undefined) {
			prismaTelemetryUpdate.power_status = telemetryFields.power_status;
		}
		if (telemetryFields.ioniser_status !== undefined) {
			prismaTelemetryUpdate.ioniser_status = telemetryFields.ioniser_status;
		}
		if (telemetryFields.dual_zone_status !== undefined) {
			prismaTelemetryUpdate.dual_zone_status = telemetryFields.dual_zone_status;
		}
		if (telemetryFields.camera_status !== undefined) {
			prismaTelemetryUpdate.camera_status = telemetryFields.camera_status;
		}
		if (telemetryFields.advert_screen_status !== undefined) {
			prismaTelemetryUpdate.advert_screen_status = telemetryFields.advert_screen_status;
		}
		if (telemetryFields.zone1_temp !== undefined) {
			prismaTelemetryUpdate.zone1_target_temp = telemetryFields.zone1_temp;
		}
		if (telemetryFields.zone2_temp !== undefined) {
			prismaTelemetryUpdate.zone2_target_temp = telemetryFields.zone2_temp;
		}

		if (Object.keys(prismaTelemetryUpdate).length > 0) {
			await tx.box_telemetry_latest.updateMany({
				where: { box_id: { in: foundIds } },
				data: prismaTelemetryUpdate,
			});
		}

		let floorName = "";
		if (assign_floor_id) {
			const floor = await tx.vertical_hospitality_floor.findUnique({
				where: { id: assign_floor_id, client_id },
			});
			floorName = floor?.name || "";
		}

		const floorBoxes = await tx.vertical_hospitality_floor_box.findMany({
			where: { box_id: { in: foundIds } },
			select: { box_id: true, floor: { select: { name: true } } },
		});
		const floorMap = new Map<string, string>();
		for (const fb of floorBoxes) {
			floorMap.set(fb.box_id, fb.floor.name);
		}

		const notificationRows = boxes.flatMap((box) => {
			const changes: string[] = [];
			if (status) {
				changes.push(`status set to ${status}`);
			}
			if (assign_floor_id !== undefined) {
				if (assign_floor_id) {
					changes.push(`assigned to floor "${floorName}"`);
				} else {
					changes.push(`unassigned from floor`);
				}
			}
			if (room !== undefined) {
				changes.push(room ? `room set to ${room}` : `room assignment removed`);
			}

			for (const key of Object.keys(telemetryUpdate)) {
				const val = telemetryUpdate[key];
				const friendlyName = key.replace("_status", "").replace("_temp", " temperature").replace("_", " ");
				changes.push(`${friendlyName} set to ${val}`);
			}

			if (changes.length === 0) return [];

			const boxFloorName = assign_floor_id !== undefined
				? (assign_floor_id ? floorName : "")
				: (floorMap.get(box.id) || "");

			return [{
				client_id,
				vertical_id: box.vertical_id,
				box_id: box.id,
				box_display_id: box.box_display_id,
				box_name: box.name || box.box_display_id,
				restaurant_name: boxFloorName || null,
				type: "success" as const,
				title: "GrubPac Settings Changed",
				description: `Settings updated for GrubPac ${box.name || box.box_display_id}: ${changes.join(", ")}.`,
			}];
		});

		if (notificationRows.length > 0) {
			await tx.notification.createMany({ data: notificationRows });
		}
	});

	if (Object.keys(telemetryUpdate).length > 0) {
		let lastError: unknown;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				await BoxConfig.updateMany(
					{ box_id: { $in: foundIds } },
					{ $set: telemetryUpdate },
				);
				lastError = undefined;
				break;
			} catch (error) {
				lastError = error;
				if (attempt < 3) {
					await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
				}
			}
		}

		if (lastError) {
			console.error("Mongo BoxConfig update failed after SQL commit for hospitality boxes:", lastError);
			throw new APIError(
				"Box settings were partially updated. Please retry the action.",
				undefined,
				undefined,
				500,
			);
		}
	}

	return { updated_count: foundIds.length };
};

export const getHospitalityDashboardMetrics = async (client_id: string) => {
	const [
		floor_count,
		employee_count,
		active_box_count,
		active_cold_chain_count,
		temperature_alarm_count,
	] = await Promise.all([
		prisma.vertical_hospitality_floor.count({
			where: { client_id, status: "active" },
		}),
		// Prisma client typing may lag behind schema changes in local env.
		// Use runtime-safe `as any` here to avoid false-positive TS errors.
		(prisma as any).vertical_hospitality_employee.count({
			where: { client_id, status: { not: "suspended" } },
		}),
		prisma.box.count({
			where: { client_id, status: "active" },
		}),
		prisma.box.count({
			where: {
				client_id,
				status: "active",
				telemetry: { power_status: "on" },
			},
		}),
		prisma.box.count({
			where: {
				client_id,
				status: "active",
				telemetry: { health_status: { in: ["critical", "attention"] } },
			},
		}),
	]);

	return {
		floor_count,
		employee_count,
		active_box_count,
		active_cold_chain_count,
		temperature_alarm_count,
	};
};
