import { prisma } from "@/db";
import { ulid } from "ulid";

export const SIMULATOR_HEARTBEAT_TIMEOUT_MS = 20_000;

const lastPingMs = new Map<string, number>();

export const recordSimulatorHeartbeat = (box_id: string) => {
	lastPingMs.set(box_id, Date.now());
};

export const clearSimulatorHeartbeat = (box_id: string) => {
	lastPingMs.delete(box_id);
};

export const isSimulatorHeartbeatStale = (box_id: string): boolean => {
	const last = lastPingMs.get(box_id);
	if (!last) return false;
	return Date.now() - last >= SIMULATOR_HEARTBEAT_TIMEOUT_MS;
};

export const getSimulatorTrackedBoxIds = (): string[] => [...lastPingMs.keys()];

const clearEmployeeLastConnectedBox = async (box_id: string, employee_id: string | null) => {
	if (!employee_id) return;

	await prisma.vertical_delivery_employee.updateMany({
		where: {
			id: employee_id,
			last_connected_box_id: box_id,
		},
		data: { last_connected_box_id: null },
	});
};

export const resetSimulatorBoxConnection = async (box_id: string) => {
	const box = await prisma.box.findUnique({
		where: { id: box_id },
		select: {
			id: true,
			connection_employee_id: true,
			medical_connection_employee_id: true,
		},
	});

	if (!box) {
		return null;
	}

	const previousDriverId = box.connection_employee_id;

	await prisma.$transaction(async (tx) => {
		await tx.box.update({
			where: { id: box_id },
			data: {
				connection_employee_id: null,
				medical_connection_employee_id: null,
			},
		});

		await tx.box_telemetry_latest.upsert({
			where: { box_id },
			update: {
				connection_status: "disconnected",
				cellular_signal: "offline",
			},
			create: {
				id: ulid(),
				box_id,
				connection_status: "disconnected",
				cellular_signal: "offline",
			},
		});
	});

	await clearEmployeeLastConnectedBox(box_id, previousDriverId);
	clearSimulatorHeartbeat(box_id);

	return box;
};

export const connectSimulatorBox = async (box_id: string, driver_id: string) => {
	const box = await prisma.box.findUnique({
		where: { id: box_id },
		select: {
			id: true,
			connection_employee_id: true,
			medical_connection_employee_id: true,
		},
	});

	if (!box) {
		return { ok: false as const, status: 404, message: "Box not found" };
	}

	const occupiedBy =
		(box.connection_employee_id && box.connection_employee_id !== driver_id
			? box.connection_employee_id
			: null) ||
		(box.medical_connection_employee_id && box.medical_connection_employee_id !== driver_id
			? box.medical_connection_employee_id
			: null);

	if (occupiedBy) {
		return {
			ok: false as const,
			status: 409,
			message: "Box is already connected to another user",
		};
	}

	await prisma.$transaction(async (tx) => {
		await tx.box.update({
			where: { id: box_id },
			data: { connection_employee_id: driver_id },
		});

		await tx.vertical_delivery_employee.updateMany({
			where: { id: driver_id },
			data: { last_connected_box_id: box_id },
		});

		await tx.box_telemetry_latest.upsert({
			where: { box_id },
			update: {
				connection_status: "connected",
				cellular_signal: "strong",
			},
			create: {
				id: ulid(),
				box_id,
				connection_status: "connected",
				cellular_signal: "strong",
			},
		});
	});

	recordSimulatorHeartbeat(box_id);

	return { ok: true as const };
};

export const disconnectSimulatorBoxOnPowerOff = async (box_id: string) => {
	const box = await prisma.box.findUnique({
		where: { id: box_id },
		select: { connection_employee_id: true },
	});

	if (!box?.connection_employee_id) {
		return;
	}

	await resetSimulatorBoxConnection(box_id);
};

export const enforceSimulatorHeartbeatTimeout = async (box_id: string) => {
	const box = await prisma.box.findUnique({
		where: { id: box_id },
		select: { connection_employee_id: true },
	});

	if (!box?.connection_employee_id) {
		clearSimulatorHeartbeat(box_id);
		return;
	}

	if (isSimulatorHeartbeatStale(box_id)) {
		await resetSimulatorBoxConnection(box_id);
	}
};

export const runSimulatorHeartbeatSweep = async () => {
	for (const box_id of getSimulatorTrackedBoxIds()) {
		await enforceSimulatorHeartbeatTimeout(box_id);
	}
};

export const buildSimulatorConnectedUser = (box: {
	connection_employee_id: string | null;
	connection_employee?: {
		id: string;
		employee_display_id: string | null;
		first_name: string;
		last_name: string | null;
	} | null;
}) => {
	if (!box.connection_employee_id) {
		return null;
	}

	return {
		driver_id: box.connection_employee_id,
		driver_user_id: box.connection_employee_id,
		employee_display_id: box.connection_employee?.employee_display_id ?? null,
		name: box.connection_employee
			? `${box.connection_employee.first_name} ${box.connection_employee.last_name || ""}`.trim()
			: null,
	};
};
