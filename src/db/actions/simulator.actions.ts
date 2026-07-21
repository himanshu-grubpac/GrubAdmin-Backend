import { prisma } from "@/db";
import type { Prisma } from "@/db/types";
import { ulid } from "ulid";
import { computeOverallBatteryLevel } from "@/utils/box-battery.ts";

type NotificationCategory = "camera" | "battery" | "lock" | "display" | "other";
type NotificationType = "warning" | "error" | "success" | "notification";

export type SimulatorNotification = {
	category: NotificationCategory;
	type: NotificationType;
	title: string;
	description: string;
};

export type SimulatorTelemetrySnapshot = {
	battery_percentage?: number | null;
	battery_1_percentage?: number | null;
	battery_2_percentage?: number | null;
	connection_status?: "connected" | "disconnected" | "unknown" | null;
	cellular_signal?: string | null;
	memory_percentage?: number | null;
	zone1_temp?: number | null;
	zone2_temp?: number | null;
	zone1_target_temp?: number | null;
	zone2_target_temp?: number | null;
	power_status?: string | null;
	charging_status?: string | null;
	bluetooth_status?: string | null;
	wifi_status?: string | null;
	gps_status?: string | null;
	solar_status?: string | null;
	port_big_status?: string | null;
	save_to_memory_status?: string | null;
	adas_status?: string | null;
	camera_status?: string | null;
	advert_screen_status?: string | null;
	ioniser_status?: string | null;
	light_status?: string | null;
	dual_zone_status?: string | null;
	zone1_status?: string | null;
	zone2_status?: string | null;
	gyrosensor_status?: string | null;
	turn_signal_status?: string | null;
};

export type SimulatorTelemetryInput = {
	connection_status?: "strong" | "weak" | "offline" | "unknown";
	battery_1_level?: number;
	battery_2_level?: number;
	battery_level?: number;
	zone_1_temp?: number;
	zone_1_target_temp?: number;
	zone_2_temp?: number;
	zone_2_target_temp?: number;
	is_power_on?: boolean;
	is_charging?: boolean;
	bluetooth_available?: boolean;
	wifi_connected?: boolean;
	zone_1_status?: boolean;
	zone_2_status?: boolean;
	is_dual_zone?: boolean;
	gps_available?: boolean;
	solar_panel?: boolean;
	"220V_110V_port"?: boolean;
	Memorycard_used?: number;
	saveToCard?: boolean;
	Adas?: boolean;
	BoxCam?: boolean;
	advert_screen?: boolean;
	ioniser?: boolean;
	light_status?: boolean;
	gyrosensor?: "ok" | "not_detected" | "error" | "unknown" | "detected";
	turn_signals?: "ok" | "not_detected" | "error" | "unknown" | "detected";
};

const TEMPERATURE_ALERT_DEVIATION = 5;
const TEMPERATURE_RECOVERY_DEVIATION = 3;

const getBatteryLevel = (
	telemetry: SimulatorTelemetrySnapshot | null | undefined,
	useCellReadings: boolean,
) => useCellReadings
	? computeOverallBatteryLevel(telemetry)
	: telemetry?.battery_percentage ?? null;

const evaluateBattery = (
	previous: SimulatorTelemetrySnapshot,
	updated: SimulatorTelemetrySnapshot,
	input: SimulatorTelemetryInput,
): SimulatorNotification[] => {
	const usesCells =
		input.battery_1_level !== undefined ||
		input.battery_2_level !== undefined;
	if (!usesCells && input.battery_level === undefined) return [];

	const previousLevel = getBatteryLevel(previous, usesCells);
	const updatedLevel = getBatteryLevel(updated, usesCells);
	if (previousLevel === null || updatedLevel === null) return [];

	if (updatedLevel <= 10 && previousLevel > 10) {
		return [{
			category: "battery",
			type: "error",
			title: "Critical battery level",
			description: `Battery level has dropped to ${updatedLevel}%.`,
		}];
	}
	if (updatedLevel <= 20 && previousLevel > 20) {
		return [{
			category: "battery",
			type: "warning",
			title: "Low battery warning",
			description: `Battery level has dropped to ${updatedLevel}%.`,
		}];
	}
	if (updatedLevel > 25 && previousLevel <= 20) {
		return [{
			category: "battery",
			type: "success",
			title: "Battery level recovered",
			description: `Battery level has recovered to ${updatedLevel}%.`,
		}];
	}
	return [];
};

const evaluateTemperatureZone = (args: {
	zone: "Zone 1" | "Zone 2";
	wasUpdated: boolean;
	previousActual: number | null | undefined;
	updatedActual: number | null | undefined;
	previousTarget: number | null | undefined;
	updatedTarget: number | null | undefined;
	previousStatus: string | null | undefined;
	updatedStatus: string | null | undefined;
}): SimulatorNotification[] => {
	if (
		!args.wasUpdated ||
		args.updatedStatus === "off" ||
		args.updatedActual == null ||
		args.updatedTarget == null
	) return [];

	const updatedDeviation = Math.abs(args.updatedActual - args.updatedTarget);
	const wasExplicitlyOff = args.previousStatus === "off";
	const previousDeviation =
		wasExplicitlyOff ||
		args.previousActual == null ||
		args.previousTarget == null
			? null
			: Math.abs(args.previousActual - args.previousTarget);

	if (
		updatedDeviation >= TEMPERATURE_ALERT_DEVIATION &&
		(wasExplicitlyOff ||
			(previousDeviation !== null &&
				previousDeviation < TEMPERATURE_ALERT_DEVIATION))
	) {
		return [{
			category: "other",
			type: "warning",
			title: `${args.zone} temperature deviation`,
			description: `${args.zone} is ${args.updatedActual}°C with a target of ${args.updatedTarget}°C.`,
		}];
	}
	if (
		updatedDeviation <= TEMPERATURE_RECOVERY_DEVIATION &&
		previousDeviation !== null &&
		previousDeviation >= TEMPERATURE_ALERT_DEVIATION
	) {
		return [{
			category: "other",
			type: "success",
			title: `${args.zone} temperature recovered`,
			description: `${args.zone} is ${args.updatedActual}°C with a target of ${args.updatedTarget}°C.`,
		}];
	}
	return [];
};

const hardwareTransitions = [
	["is_power_on", "power_status", "Power", "other", true],
	["is_charging", "charging_status", "Charging", "other", false],
	["bluetooth_available", "bluetooth_status", "Bluetooth", "other", false],
	["wifi_connected", "wifi_status", "Wi-Fi", "other", false],
	["gps_available", "gps_status", "GPS", "other", false],
	["solar_panel", "solar_status", "Solar panel", "other", false],
	["220V_110V_port", "port_big_status", "220V/110V port", "other", false],
	["saveToCard", "save_to_memory_status", "Save to card", "other", false],
	["Adas", "adas_status", "ADAS", "other", false],
	["BoxCam", "camera_status", "Camera", "camera", false],
	["advert_screen", "advert_screen_status", "Advertising display", "display", false],
	["ioniser", "ioniser_status", "Ioniser", "other", false],
	["light_status", "light_status", "Light", "other", false],
	["is_dual_zone", "dual_zone_status", "Dual-zone mode", "other", false],
	["zone_1_status", "zone1_status", "Zone 1", "other", false],
	["zone_2_status", "zone2_status", "Zone 2", "other", false],
] as const;

const evaluateHardwareTransitions = (
	previous: SimulatorTelemetrySnapshot,
	updated: SimulatorTelemetrySnapshot,
	input: SimulatorTelemetryInput,
): SimulatorNotification[] => {
	const notifications: SimulatorNotification[] = [];
	for (const [inputKey, telemetryKey, label, category, powerOffIsError] of hardwareTransitions) {
		if (input[inputKey] === undefined) continue;
		const previousState = previous[telemetryKey];
		const updatedState = updated[telemetryKey];
		if (updatedState === previousState || (updatedState !== "on" && updatedState !== "off")) continue;

		const isOn = updatedState === "on";
		notifications.push({
			category,
			type: isOn ? "success" : powerOffIsError ? "error" : "warning",
			title: `${label} turned ${isOn ? "on" : "off"}`,
			description: `${label} state changed to ${isOn ? "on" : "off"}.`,
		});
	}
	return notifications;
};

const evaluateCollapsedEnum = (
	label: "Gyroscope" | "Turn signals",
	value: NonNullable<SimulatorTelemetryInput["gyrosensor"]>,
	previousState: string | null | undefined,
): SimulatorNotification[] => {
	const isHealthy = value === "ok" || value === "detected";
	if (isHealthy) {
		if (previousState === "on") return [];
		return [{
			category: "other",
			type: "success",
			title: `${label} detected`,
			description: `${label} state changed to ${value}.`,
		}];
	}

	// All unhealthy enum values persist as "off". Once persisted, their exact
	// distinction is unavailable, so suppress further alerts until recovery.
	if (previousState === "off") return [];
	return [{
		category: "other",
		type: value === "error" ? "error" : "warning",
		title: `${label} ${value === "error" ? "error" : "unavailable"}`,
		description: `${label} state changed to ${value}.`,
	}];
};

export const evaluateSimulatorTelemetryNotifications = (
	previous: SimulatorTelemetrySnapshot | null | undefined,
	updated: SimulatorTelemetrySnapshot | null | undefined,
	input: SimulatorTelemetryInput,
): SimulatorNotification[] => {
	if (!previous || !updated) return [];
	const notifications = evaluateBattery(previous, updated, input);

	if (input.connection_status !== undefined) {
		const previousConnection = previous.cellular_signal ?? "unknown";
		if (input.connection_status !== previousConnection) {
			if (input.connection_status === "strong") {
				notifications.push({
					category: "other",
					type: "success",
					title: "Connection restored",
					description: "Cellular connection returned to strong.",
				});
			}
			else if (input.connection_status === "offline") {
				notifications.push({
					category: "other",
					type: "error",
					title: "Connection offline",
					description: "Cellular connection changed to offline.",
				});
			}
			else {
				notifications.push({
					category: "other",
					type: "warning",
					title: input.connection_status === "weak" ? "Weak connection" : "Connection unknown",
					description: `Cellular connection changed to ${input.connection_status}.`,
				});
			}
		}
	}

	if (input.Memorycard_used !== undefined) {
		const previousMemory = previous.memory_percentage;
		const updatedMemory = updated.memory_percentage;
		if (
			updatedMemory != null &&
			updatedMemory >= 90 &&
			previousMemory != null &&
			previousMemory < 90
		) {
			notifications.push({
				category: "other",
				type: "warning",
				title: "Storage nearly full",
				description: `Memory card usage reached ${updatedMemory}%.`,
			});
		}
		else if (
			updatedMemory != null &&
			updatedMemory < 85 &&
			previousMemory != null &&
			previousMemory >= 90
		) {
			notifications.push({
				category: "other",
				type: "success",
				title: "Storage usage recovered",
				description: `Memory card usage decreased to ${updatedMemory}%.`,
			});
		}
	}

	notifications.push(
		...evaluateTemperatureZone({
			zone: "Zone 1",
			wasUpdated:
				input.zone_1_temp !== undefined ||
				input.zone_1_target_temp !== undefined ||
				input.zone_1_status !== undefined,
			previousActual: previous.zone1_temp,
			updatedActual: updated.zone1_temp,
			previousTarget: previous.zone1_target_temp,
			updatedTarget: updated.zone1_target_temp,
			previousStatus: previous.zone1_status,
			updatedStatus: updated.zone1_status,
		}),
		...evaluateTemperatureZone({
			zone: "Zone 2",
			wasUpdated:
				input.zone_2_temp !== undefined ||
				input.zone_2_target_temp !== undefined ||
				input.zone_2_status !== undefined,
			previousActual: previous.zone2_temp,
			updatedActual: updated.zone2_temp,
			previousTarget: previous.zone2_target_temp,
			updatedTarget: updated.zone2_target_temp,
			previousStatus: previous.zone2_status,
			updatedStatus: updated.zone2_status,
		}),
		...evaluateHardwareTransitions(previous, updated, input),
	);

	if (input.gyrosensor !== undefined) {
		notifications.push(
			...evaluateCollapsedEnum("Gyroscope", input.gyrosensor, previous.gyrosensor_status),
		);
	}
	if (input.turn_signals !== undefined) {
		notifications.push(
			...evaluateCollapsedEnum("Turn signals", input.turn_signals, previous.turn_signal_status),
		);
	}

	return notifications;
};

export const getLockTransitionNotification = (
	previousStatus: string | null | undefined,
	updatedStatus: "locked" | "unlocked",
): SimulatorNotification | null => {
	if (previousStatus === updatedStatus) return null;
	return updatedStatus === "locked"
		? {
				category: "lock",
				type: "notification",
				title: "Box locked",
				description: "Box lock state changed to locked.",
			}
		: {
				category: "lock",
				type: "success",
				title: "Box unlocked",
				description: "Box lock state changed to unlocked.",
			};
};

export const ensureSimulatorBoxLock = async (box_id: string) => {
	return prisma.box_lock.upsert({
		where: { box_id },
		update: {},
		create: {
			id: ulid(),
			box_id,
			lock_status: "unlocked",
		},
		select: { lock_status: true },
	});
};

export const updateBoxTelemetry = async (
	box_id: string,
	data: Prisma.box_telemetry_latestUpdateInput
) => {
	// Omit box_id from the create data as it's already specified in the relation if needed, or explicitly pass it
	return prisma.box_telemetry_latest.upsert({
		where: { box_id },
		update: data,
		create: {
			id: ulid(),
			box_id,
			...(data as any),
		},
	});
};

type CreateSimulatorNotificationArgs = {
	category: string;
	type: string;
	title: string;
	description: string;
};

export const createSimulatorNotifications = async (
	box_id: string,
	notifications: CreateSimulatorNotificationArgs[],
) => {
	if (notifications.length === 0) return { count: 0 };

	const box = await prisma.box.findUnique({
		where: { id: box_id },
		select: {
			client_id: true,
			vertical_id: true,
			box_display_id: true,
			name: true,
		},
	});

	if (!box?.client_id) {
		throw new Error(box ? "Box is not assigned to a client" : "Box not found");
	}
	const client_id = box.client_id;

	return prisma.notification.createMany({
		data: notifications.map((notification) => ({
			id: ulid(),
			client_id,
			vertical_id: box.vertical_id,
			box_id,
			box_display_id: box.box_display_id,
			box_name: box.name,
			category: notification.category as any,
			type: notification.type as any,
			title: notification.title,
			description: notification.description,
			is_read: false,
			is_dismissed: false,
		})),
	});
};

export const createSimulatorNotification = async (
	args: CreateSimulatorNotificationArgs & { box_id: string },
) => {
	const { box_id, ...notification } = args;
	return createSimulatorNotifications(box_id, [notification]);
};
