import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { BoxConfig } from "@/db/mongo-schema";

interface GetMedicalBoxesArgs {
	page?: number;
	limit?: number;
	query?: string;
	status?: "active" | "suspended";
	department_id?: string | null;
	employee_id?: string | null;
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
	permission_status?: string;
}

export const getMedicalBoxes = async (args: GetMedicalBoxesArgs) => {
	const {
		page = 1,
		limit,
		query,
		status,
		department_id,
		employee_id,
		client_id,
		connection_status,
		power_status,
		health_status,
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

	if (connection_status) {
		where.telemetry = {
			connection_status,
		};
	}

	if (power_status) {
		where.telemetry = {
			...(where.telemetry || {}),
			power_status,
		};
	}

	if (health_status) {
		where.telemetry = {
			...(where.telemetry || {}),
			health_status,
		};
	}

	if (department_id) {
		where.medical_department_boxes = {
			some: {
				department_id,
			},
		};
	}

	if (employee_id) {
		where.medical_employee_boxes = {
			some: {
				employee_id,
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
			medical_department_boxes: {
				include: {
					department: {
						select: { id: true, name: true },
					},
				},
			},
			medical_employee_boxes: {
				include: {
					employee: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							employee_display_id: true,
						},
					},
				},
			},
			medical_connection_employee: {
				select: {
					id: true,
					first_name: true,
					last_name: true,
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
		boxes: boxesResponse.value,
		count: boxesCountResponse.value,
	};
};

interface GetMedicalBoxDetailsArgs {
	id: string;
	client_id: string;
	with_permission_for_employee_id?: string;
}

export const getMedicalBoxDetails = async (args: GetMedicalBoxDetailsArgs) => {
	const { id, client_id, with_permission_for_employee_id } = args;

	const box = await prisma.box.findFirst({
		where: { id, client_id },
		include: {
			telemetry: true,
			medical_department_boxes: {
				include: {
					department: {
						select: { id: true, name: true },
					},
				},
			},
			medical_employee_boxes: {
				include: {
					employee: {
						select: {
							id: true,
							first_name: true,
							last_name: true,
							employee_display_id: true,
						},
					},
				},
			},
			medical_connection_employee: {
				select: {
					id: true,
					first_name: true,
					last_name: true,
				},
			},
		},
	});

	if (!box) {
		throw new APIError(undefined, "medical.box.NOT_FOUND", undefined, 404);
	}

	return box;
};

interface SearchMedicalBoxesArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: "active" | "suspended";
}

export const searchMedicalBoxes = async (args: SearchMedicalBoxesArgs) => {
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

interface ToggleSuspendMedicalBoxesArgs {
	ids: string[];
	client_id: string;
	state: "active" | "suspended";
}

export const toggleSuspendMedicalBoxes = async (
	args: ToggleSuspendMedicalBoxesArgs,
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
		await prisma.box.updateMany({
			where: { id: { in: toUpdate.map((b) => b.id) } },
			data: { status: args.state },
		});
	}

	return {
		updated_count: toUpdate.length,
		already_in_state_count: alreadyInState.length,
		not_found_count: args.ids.length - boxes.length,
	};
};

interface DeleteMedicalBoxesArgs {
	ids: string[];
	client_id: string;
}

export const deleteMedicalBoxes = async (args: DeleteMedicalBoxesArgs) => {
	const { ids, client_id } = args;

	await prisma.$transaction(async (tx) => {
		await tx.vertical_medical_department_box.deleteMany({
			where: { box_id: { in: ids } },
		});

		await tx.vertical_medical_employee_box.deleteMany({
			where: { box_id: { in: ids } },
		});

		await tx.vertical_medical_consumer_box.deleteMany({
			where: { box_id: { in: ids } },
		});

		await tx.box.deleteMany({
			where: { id: { in: ids }, client_id },
		});
	});

	return { deleted_count: ids.length };
};

interface ReassignBoxesToDepartmentArgs {
	box_ids: string[];
	destination_department_id: string | null;
	client_id: string;
}

export const reassignBoxesToDepartment = async (
	args: ReassignBoxesToDepartmentArgs,
) => {
	const { box_ids, destination_department_id, client_id } = args;

	const boxes = await prisma.box.findMany({
		where: { id: { in: box_ids }, client_id },
	});

	if (boxes.length === 0) {
		throw new APIError("No boxes found", undefined, undefined, 404);
	}

	await prisma.$transaction(async (tx) => {
		await tx.vertical_medical_department_box.deleteMany({
			where: { box_id: { in: box_ids } },
		});

		if (destination_department_id) {
			const department = await tx.vertical_medical_department.findUnique({
				where: { id: destination_department_id, client_id },
			});

			if (!department) {
				throw new APIError("Destination department not found", undefined, undefined, 404);
			}

			await tx.vertical_medical_department_box.createMany({
				data: box_ids.map((box_id) => ({
					box_id,
					department_id: destination_department_id,
				})),
			});
		}
	});

	return { updated_count: box_ids.length };
};

interface ActionMedicalBoxesArgs {
	ids: string[];
	client_id: string;
	status?: "active" | "suspended";
	power_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	zone1_temp?: number;
	zone2_temp?: number;
	ext_temp?: number;
	assign_department_id?: string | null;
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

export const actionMedicalBoxes = async (args: ActionMedicalBoxesArgs) => {
	const {
		ids,
		client_id,
		status,
		assign_department_id,
		...telemetryFields
	} = args;

	const boxes = await prisma.box.findMany({
		where: { id: { in: ids }, client_id },
	});

	if (boxes.length === 0) {
		throw new APIError("No boxes found", undefined, undefined, 404);
	}

	const foundIds = boxes.map((b) => b.id);

	await prisma.$transaction(async (tx) => {
		if (status) {
			await tx.box.updateMany({
				where: { id: { in: foundIds } },
				data: { status },
			});
		}

		if (assign_department_id !== undefined) {
			await tx.vertical_medical_department_box.deleteMany({
				where: { box_id: { in: foundIds } },
			});

			if (assign_department_id) {
				const department = await tx.vertical_medical_department.findUnique({
					where: { id: assign_department_id, client_id },
				});

				if (!department) {
					throw new APIError("Department not found", undefined, undefined, 404);
				}

				await tx.vertical_medical_department_box.createMany({
					data: foundIds.map((box_id) => ({
						box_id,
						department_id: assign_department_id,
					})),
				});
			}
		}

		const telemetryUpdate: any = {};
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
			await BoxConfig.updateMany(
				{ box_id: { $in: foundIds } },
				{ $set: telemetryUpdate },
			);
		}
	});

	return { updated_count: foundIds.length };
};

interface AssignBoxToEmployeeArgs {
	box_ids: string[];
	employee_ids: string[];
	client_id: string;
}

export const assignMedicalBoxToEmployee = async (
	args: AssignBoxToEmployeeArgs,
) => {
	const { box_ids, employee_ids, client_id } = args;

	const employees = await prisma.vertical_medical_employee.findMany({
		where: { id: { in: employee_ids }, client_id },
	});

	if (employees.length === 0) {
		throw new APIError("No employees found", undefined, undefined, 404);
	}

	const boxes = await prisma.box.findMany({
		where: { id: { in: box_ids }, client_id },
	});

	if (boxes.length === 0) {
		throw new APIError("No boxes found", undefined, undefined, 404);
	}

	await prisma.vertical_medical_employee_box.createMany({
		data: box_ids.flatMap((box_id) =>
			employee_ids.map((employee_id) => ({
				box_id,
				employee_id,
			})),
		),
		skipDuplicates: true,
	});

	return { assigned_count: box_ids.length * employee_ids.length };
};

export const getMedicalEmployeeBoxes = async (employeeId: string) => {
	const assignments = await prisma.vertical_medical_employee_box.findMany({
		where: { employee_id: employeeId },
		include: {
			box: {
				include: {
					vertical: true,
					medical_connection_employee: true,
					medical_employee_boxes: true,
					telemetry: true,
				},
			},
		},
	});

	return assignments
		.filter((a) => a.box)
		.map((a) => a.box);
};

export const getMedicalDashboardMetrics = async (client_id: string) => {
	const [
		department_count,
		employee_count,
		active_box_count,
		active_cold_chain_count,
		temperature_alarm_count,
	] = await Promise.all([
		prisma.vertical_medical_department.count({
			where: { client_id, status: "active" },
		}),
		prisma.vertical_medical_employee.count({
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
		department_count,
		employee_count,
		active_box_count,
		active_cold_chain_count,
		temperature_alarm_count,
	};
};
