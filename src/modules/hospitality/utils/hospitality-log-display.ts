import { prisma } from "@/db";

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const ULID_GLOBAL_RE = /\b[0-9A-HJKMNP-TV-Z]{26}\b/g;
const BRACKET_PAIR_RE = /\[([^\[\]]+)\]/g;

export function isUlid(value: string): boolean {
	return ULID_PATTERN.test(value);
}

export function hospitalityBoxLogSubject(box: {
	id: string;
	name?: string | null;
	box_display_id?: string | null;
}) {
	const displayName = box.name?.trim() || box.box_display_id?.trim() || "Box";
	return {
		id: box.id,
		name: displayName,
		type: "box" as const,
	};
}

export async function fetchHospitalityBoxLogSubjects(
	boxIds: string[],
	clientId: string,
): Promise<Map<string, ReturnType<typeof hospitalityBoxLogSubject>>> {
	if (boxIds.length === 0) return new Map();

	const uniqueIds = [...new Set(boxIds)];
	const boxes = await prisma.box.findMany({
		where: { id: { in: uniqueIds }, client_id: clientId },
		select: { id: true, name: true, box_display_id: true },
	});

	return new Map(boxes.map((box) => [box.id, hospitalityBoxLogSubject(box)]));
}

export type HospitalityLogDisplayContext = {
	floorNames: Map<string, string>;
};

export async function buildHospitalityLogDisplayContext(
	logs: Array<{ metadata?: Record<string, unknown> | null }>,
	clientId: string,
): Promise<HospitalityLogDisplayContext> {
	const floorIds = new Set<string>();

	for (const log of logs) {
		const metadata = log.metadata ?? {};
		for (const key of ["new_group", "old_group", "floor", "floor_id"] as const) {
			const value = metadata[key];
			if (typeof value === "string" && isUlid(value)) {
				floorIds.add(value);
			}
		}
	}

	if (floorIds.size === 0) {
		return { floorNames: new Map() };
	}

	const floors = await prisma.vertical_hospitality_floor.findMany({
		where: { id: { in: [...floorIds] }, client_id: clientId },
		select: { id: true, name: true },
	});

	return {
		floorNames: new Map(floors.map((floor) => [floor.id, floor.name])),
	};
}

function actorDisplayName(actor?: { name?: string; id?: string } | null): string {
	const name = actor?.name?.trim();
	if (!name || isUlid(name)) return "Manager";
	return name;
}

function resolveGroupLabel(value: unknown, floorNames: Map<string, string>): string {
	if (value === null || value === undefined || value === "") return "unassigned";
	const text = String(value).trim();
	if (!text || text === "unassigned") return "unassigned";
	if (floorNames.has(text)) return floorNames.get(text)!;
	if (isUlid(text)) return "group";
	return text;
}

function formatTemperatureValue(value: unknown): string {
	const num = Number(value);
	if (Number.isFinite(num)) {
		return Number.isInteger(num) ? `${num}` : `${num}`;
	}
	return String(value ?? "");
}

function resolveOnOffState(
	metadata: Record<string, unknown>,
	keys: string[],
): boolean | undefined {
	for (const key of keys) {
		const raw = metadata[key];
		if (raw === undefined || raw === null || raw === "") continue;
		const value = String(raw).trim().toUpperCase();
		if (value === "OFF" || value === "FALSE" || value === "0" || value === "CLOSED" || value === "LOCKED") {
			return false;
		}
		if (value === "ON" || value === "TRUE" || value === "1" || value === "OPEN" || value === "UNLOCKED") {
			return true;
		}
	}
	return undefined;
}

function resolveZoneLabel(metadata: Record<string, unknown>): string {
	const zoneRaw = metadata.zone ?? metadata.field ?? metadata.zone_label;
	if (typeof zoneRaw === "string" && /zone\s*2/i.test(zoneRaw)) return "Zone 2";
	if (typeof zoneRaw === "string" && /zone\s*1/i.test(zoneRaw)) return "Zone 1";
	if (metadata.zone2_temp !== undefined || metadata.zone2_target !== undefined) return "Zone 2";
	return "Zone 1";
}

function resolveTemperatureValue(metadata: Record<string, unknown>): unknown {
	return (
		metadata.value ??
		metadata.new_value ??
		metadata.zone1_temp ??
		metadata.zone1_target ??
		metadata.zone2_temp ??
		metadata.zone2_target
	);
}

export function sanitizeHospitalityLogText(text: string): string {
	if (!text) return "";

	let cleaned = text.replace(BRACKET_PAIR_RE, (_match, inner: string) => {
		const parts = inner.split(",").map((part) => part.trim());
		const namePart = parts.find((part) => part && !isUlid(part));
		return namePart ?? "";
	});

	cleaned = cleaned.replace(ULID_GLOBAL_RE, "");
	cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();

	return cleaned;
}

type HospitalityLogRow = {
	type?: string;
	description?: string;
	action?: string;
	message?: string;
	actor?: { name?: string; id?: string } | null;
	metadata?: Record<string, unknown> | null;
	subject?: { name?: string; id?: string } | null;
};

export function formatHospitalityGrubpacLogAction(
	log: HospitalityLogRow,
	context: HospitalityLogDisplayContext,
): string {
	const type = log.type ?? "";
	const metadata = log.metadata ?? {};
	const actorName = actorDisplayName(log.actor);
	const { floorNames } = context;

	switch (type) {
		case "Box status": {
			const isOn = resolveOnOffState(metadata, ["state", "power_status", "power"]);
			return isOn === false ? "Box turned OFF" : "Box turned ON";
		}
		case "Ioniser status": {
			const isOn = resolveOnOffState(metadata, ["state", "ioniser_status", "ioniser"]);
			return isOn === false ? "Ioniser turned OFF" : "Ioniser turned ON";
		}
		case "Temperature set": {
			const zone = resolveZoneLabel(metadata);
			const value = resolveTemperatureValue(metadata);
			if (value !== undefined && value !== null && value !== "") {
				return `${zone} set to ${formatTemperatureValue(value)}°C`;
			}
			break;
		}
		case "Temp. self check": {
			const zone1 = metadata.zone1_temp ?? metadata.zone1_target;
			if (zone1 !== undefined && zone1 !== null && zone1 !== "") {
				return `Temp. self check completed (zone 1: ${formatTemperatureValue(zone1)}°C)`;
			}
			break;
		}
		case "Battery self check": {
			const level = metadata.battery_percentage ?? metadata.battery_level;
			if (level !== undefined && level !== null && level !== "") {
				return `Battery B self-check OK (Battery level: ${level}%)`;
			}
			break;
		}
		case "Battery status": {
			const pct = metadata.battery_percentage ?? metadata.battery_level;
			if (pct !== undefined && pct !== null && pct !== "") return `Battery at ${pct}%`;
			break;
		}
		case "Activation":
			return `Box reactivated and marked as unassigned by ${actorName}`;
		case "Suspension":
			return `Box suspended by ${actorName}`;
		case "Deletion":
			return `Box deleted by ${actorName}`;
		case "Assignment": {
			const group = resolveGroupLabel(
				metadata.new_group ?? metadata.floor ?? metadata.floor_name,
				floorNames,
			);
			return `Box assigned to ${group} by ${actorName}`;
		}
		case "Reassignment": {
			const oldGroup = resolveGroupLabel(metadata.old_group, floorNames);
			const newGroup = resolveGroupLabel(metadata.new_group, floorNames);
			return `Box reassigned from ${oldGroup} to ${newGroup} by ${actorName}`;
		}
		case "Updation": {
			const field = metadata.field;
			const newVal = metadata.new_value;
			const oldVal = metadata.old_value;
			if (field) {
				const label = String(field).replace(/_/g, " ");
				const displayNew = isUlid(String(newVal ?? "")) ? label : (newVal ?? "Y");
				const displayOld = isUlid(String(oldVal ?? "")) ? "X" : (oldVal ?? "X");
				if (newVal !== undefined && oldVal !== undefined) {
					return `Box ${label} updated from ${displayOld} to ${displayNew} by ${actorName}`;
				}
				if (newVal !== undefined) {
					return `Box ${label} updated to ${displayNew} by ${actorName}`;
				}
			}
			break;
		}
		case "Connection status": {
			if (
				metadata.disconnected === true ||
				metadata.connection === "disconnected" ||
				metadata.state === "disconnected"
			) {
				return "Box lost connectivity";
			}
			return `Box connected to ${metadata.driver_name || "driver"}`;
		}
		case "Ownership":
			return `Ownership of box transferred to ${metadata.new_owner || "new owner"} by ${actorName}`;
		case "Door status": {
			if (metadata.action === "door_open" || metadata.action === "open") {
				return "Door opened";
			}
			if (metadata.action === "door_close" || metadata.action === "close") {
				return "Door closed";
			}
			const isOpen = resolveOnOffState(metadata, ["state", "door_status"]);
			if (isOpen === true) return "Door unlocked";
			if (isOpen === false) return "Door locked";
			break;
		}
	}

	const fromDescription = sanitizeHospitalityLogText(
		log.description || log.action || log.message || "",
	);
	if (fromDescription) return fromDescription;

	return type.trim();
}

/** Mongoose documents lose schema fields when spread; normalize before JSON response. */
function toPlainLogRow<T extends Record<string, unknown>>(log: T): T {
	const doc = log as T & { toObject?: () => T; toJSON?: () => T };
	if (typeof doc.toObject === "function") {
		return doc.toObject();
	}
	if (typeof doc.toJSON === "function") {
		return doc.toJSON();
	}
	return { ...log };
}

function resolveLogTimestampIso(log: Record<string, unknown>): string | undefined {
	const raw = log.createdAt ?? log.created_at ?? log.timestamp;
	if (raw == null || raw === "") return undefined;
	if (raw instanceof Date) return raw.toISOString();
	return String(raw);
}

const HIGHLIGHT_LOG_TYPES = new Set(["Suspension", "Deletion", "Activation"]);

export function formatHospitalityGrubpacLogsForResponse<
	T extends HospitalityLogRow & Record<string, unknown>,
>(logs: T[], context: HospitalityLogDisplayContext): T[] {
	return logs.map((log) => {
		const plain = toPlainLogRow(log);
		const action = formatHospitalityGrubpacLogAction(plain, context);
		const timestamp = resolveLogTimestampIso(plain);
		const type = String(plain.type ?? "");
		const category = String(plain.category ?? "GrubPac");

		return {
			...plain,
			type,
			category,
			...(timestamp
				? { createdAt: timestamp, created_at: timestamp, timestamp }
				: {}),
			action,
			description: action,
			message: action,
			actionHighlight: HIGHLIGHT_LOG_TYPES.has(type),
			actor: plain.actor
				? {
						...plain.actor,
						name: actorDisplayName(plain.actor),
					}
				: plain.actor,
			subject: plain.subject
				? {
						...plain.subject,
						name:
							plain.subject.name && !isUlid(plain.subject.name)
								? plain.subject.name
								: sanitizeHospitalityLogText(plain.subject.name ?? "") || "Box",
					}
				: plain.subject,
		} as T;
	});
}
