import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { BoxConfig } from "@/db/mongo-schema";

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

interface GetHospitalityBoxesArgs {
	page?: number;
	limit?: number;
	query?: string;
	status?: "active" | "suspended";
	floor_id?: string | null;
	client_id: string;
	group_by?: string;
	connection_status?: string;
	power_status?: string;
	health_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	zone1_min?: number;
	zone1_max?: number;
	zone2_min?: number;
	zone2_max?: number;
	ext_min?: number;
	ext_max?: number;
}

export const getHospitalityBoxes = async (args: GetHospitalityBoxesArgs) => {
	const {
		page = 1,
		limit,
		query,
		status,
		floor_id,
		client_id,
		connection_status,
		power_status,
		health_status,
		ioniser_status,
		dual_zone_status,
		zone1_min,
		zone1_max,
		zone2_min,
		zone2_max,
		ext_min,
		ext_max,
	} = args;

	const where: any = {
		client_id,
	};

	if (status) {
		where.status = status;
	}

	if (query) {
		where.OR = [
			{ name: { contains: query } },
			{ box_display_id: { contains: query } },
		];
	}

	const telemetryFilter: any = {};
	if (connection_status) telemetryFilter.connection_status = connection_status;
	if (health_status) telemetryFilter.health_status = health_status;
	if (ioniser_status) telemetryFilter.ioniser_status = ioniser_status;
	if (dual_zone_status) telemetryFilter.dual_zone_status = dual_zone_status;

	if (power_status && power_status !== "offline") {
		telemetryFilter.power_status = power_status;
	}

	if (zone1_min !== undefined || zone1_max !== undefined) {
		telemetryFilter.zone1_temp = { gte: zone1_min, lte: zone1_max };
	}
	if (zone2_min !== undefined || zone2_max !== undefined) {
		telemetryFilter.zone2_temp = { gte: zone2_min, lte: zone2_max };
	}
	if (ext_min !== undefined || ext_max !== undefined) {
		telemetryFilter.ext_temp = { gte: ext_min, lte: ext_max };
	}

	if (Object.keys(telemetryFilter).length > 0) {
		where.telemetry = telemetryFilter;
	}

	if (power_status === "offline") {
		where.AND = [
			{
				OR: [
					{ telemetry: { power_status: { in: ["off", "unknown"] } } },
					{ telemetry: null },
				],
			},
		];
	}

	if (floor_id) {
		where.hospitality_floor_boxes = {
			some: {
				floor_id,
			},
		};
	}

	const queryArgs: any = {
		where,
		skip: limit ? (page - 1) * limit : undefined,
		take: limit || undefined,
		orderBy: { created_at: "desc" },
		include: {
			telemetry: true,
			hospitality_floor_boxes: {
				include: {
					floor: {
						select: { id: true, name: true },
					},
				},
			},
		},
	};

	const [boxesResponse, boxesCountResponse] = await Promise.allSettled([
		prisma.box.findMany(queryArgs),
		prisma.box.count({ where }),
	]);

	if (boxesResponse.status === "rejected") {
		throw new APIError(String(boxesResponse.reason), undefined, undefined, 400);
	}

	if (boxesCountResponse.status === "rejected") {
		throw new APIError(String(boxesCountResponse.reason), undefined, undefined, 400);
	}

	return {
		boxes: boxesResponse.value.map(sanitizeHospitalityBox),
		count: boxesCountResponse.value,
	};
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
			hospitality_floor_boxes: {
				include: {
					floor: {
						select: { id: true, name: true },
					},
				},
			},
		},
	});

	if (!box) {
		throw new APIError(undefined, "hospitality.box.NOT_FOUND", undefined, 404);
	}

	return sanitizeHospitalityBox(box);
};

interface SearchHospitalityBoxesArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: "active" | "suspended";
}

export const searchHospitalityBoxes = async (args: SearchHospitalityBoxesArgs) => {
	const { query, client_id, limit = 50, status } = args;

	return prisma.box.findMany({
		where: {
			client_id,
			status: status || { not: "suspended" },
			OR: query
				? [
					{ name: { contains: query } },
					{ box_display_id: { contains: query } },
				]
				: undefined,
		},
		select: {
			id: true,
			name: true,
			box_display_id: true,
			status: true,
		},
		take: limit,
	});
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
	});

	if (boxes.length === 0) {
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

		const validFields = [
			"power_status", "ioniser_status", "dual_zone_status",
			"zone1_temp", "zone2_temp", "ext_temp",
			"adas_status", "bluetooth_status", "camera_status",
			"gps_status", "gyrosensor_status", "save_to_memory_status",
			"sim_status", "solar_status", "wifi_status",
			"turn_signal_status", "advert_screen_status",
			"port_small_status", "port_big_status",
		];

		for (const field of validFields) {
			if ((telemetryFields as any)[field] !== undefined) {
				telemetryUpdate[field] = (telemetryFields as any)[field];
			}
		}

		if (Object.keys(telemetryUpdate).length > 0) {
			await tx.box_telemetry_latest.updateMany({
				where: { box_id: { in: foundIds } },
				data: telemetryUpdate,
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
			include: { floor: true },
		});
		const floorMap = new Map<string, string>();
		for (const fb of floorBoxes) {
			floorMap.set(fb.box_id, fb.floor.name);
		}

		for (const box of boxes) {
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

			const telemetryKeys = Object.keys(telemetryUpdate);
			for (const key of telemetryKeys) {
				const val = telemetryUpdate[key];
				const friendlyName = key.replace("_status", "").replace("_temp", " temperature").replace("_", " ");
				changes.push(`${friendlyName} set to ${val}`);
			}

			if (changes.length > 0) {
				const description = `Settings updated for GrubPac ${box.name || box.box_display_id}: ${changes.join(", ")}.`;
				let boxFloorName = floorMap.get(box.id) || "";
				if (assign_floor_id !== undefined) {
					boxFloorName = assign_floor_id ? floorName : "";
				}

			await tx.notification.create({
				data: {
					client_id,
					vertical_id: box.vertical_id,
					box_id: box.id,
						box_display_id: box.box_display_id,
						box_name: box.name || box.box_display_id,
						restaurant_name: boxFloorName || null,
						type: "success",
						title: "GrubPac Settings Changed",
						description,
					},
				});
			}
		}
	});

	if (Object.keys(telemetryUpdate).length > 0) {
		await BoxConfig.updateMany(
			{ box_id: { $in: foundIds } },
			{ $set: telemetryUpdate },
		);
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
