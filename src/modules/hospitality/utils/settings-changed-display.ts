import { prisma } from "@/db";
import { formatHospitalityGrubpacLogAction } from "hospitality/utils/hospitality-log-display.ts";

export const SETTINGS_CHANGED_LOG_TYPES = [
	"Box status",
	"Ioniser status",
	"Temperature set",
	"Updation",
] as const;

export function formatSettingsChangedTimestamp(date: Date = new Date()): string {
	const day = String(date.getDate()).padStart(2, "0");
	const month = date.toLocaleDateString("en-GB", { month: "short" });
	const year = String(date.getFullYear()).slice(-2);
	const time = date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	return `${day} ${month} '${year}, ${time}`;
}

export function buildHospitalityBoxChangedSubline(box: {
	box_display_id?: string | null;
	box_id?: string | null;
	room?: string | null;
	floor_name?: string | null;
	identifier?: string | null;
}): string {
	if (box.identifier) return box.identifier;

	const displayId = box.box_display_id || box.box_id;
	if (!displayId) return "";

	const parts = [`#${String(displayId).replace(/^#/, "")}`];
	const room = box.room?.trim();
	if (room) {
		parts.push(room.toLowerCase().startsWith("room") ? room : `Room ${room}`);
	}
	const floorName = box.floor_name?.trim();
	if (floorName) parts.push(floorName);

	return parts.join(" | ");
}

export function deriveBulkSettingsActionLabel(body: {
	power_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	zone1_temp?: number;
	room?: string | null;
	assign_floor_id?: string | null;
}): string {
	if (body.power_status !== undefined) {
		return body.power_status === "on" ? "Box turned ON" : "Box turned OFF";
	}
	if (body.ioniser_status !== undefined) {
		return body.ioniser_status === "on" ? "Ioniser turned ON" : "Ioniser turned OFF";
	}
	if (body.zone1_temp !== undefined || body.dual_zone_status !== undefined) {
		const dualLabel = body.dual_zone_status === "on" ? "Dual mode on" : "Dual mode off";
		const tempLabel =
			body.zone1_temp !== undefined
				? `Temperature set to ${body.zone1_temp}°C`
				: "Temperature set";
		return `${dualLabel}, ${tempLabel}`;
	}
	if (body.room === null) {
		return "Room assignment removed";
	}
	return "Settings updated";
}

export type SettingsChangedAuditBox = {
	id: string;
	name: string;
	subline: string;
};

export type SettingsChangedAuditPayload = {
	batch_id: string;
	since: string;
	timestamp: string;
	action_label: string;
	boxes: SettingsChangedAuditBox[];
};

export async function fetchHospitalitySettingsChangedBoxes(
	boxIds: string[],
	clientId: string,
): Promise<Map<string, SettingsChangedAuditBox>> {
	if (boxIds.length === 0) return new Map();

	const uniqueIds = [...new Set(boxIds)];
	const boxes = await prisma.box.findMany({
		where: { id: { in: uniqueIds }, client_id: clientId },
		select: {
			id: true,
			name: true,
			box_display_id: true,
			hospitality_floor_boxes: {
				select: {
					room: true,
					floor: { select: { name: true } },
				},
				take: 1,
				orderBy: { created_at: "desc" },
			},
		},
	});

	const result = new Map<string, SettingsChangedAuditBox>();
	for (const box of boxes) {
		const floorBox = box.hospitality_floor_boxes[0];
		const room = floorBox?.room ?? "";
		const floorName = floorBox?.floor?.name ?? "";
		const displayId = box.box_display_id?.trim();
		result.set(box.id, {
			id: box.id,
			name: box.name?.trim() || displayId || "Unknown box",
			subline: buildHospitalityBoxChangedSubline({
				box_display_id: displayId,
				room,
				floor_name: floorName,
			}),
		});
	}

	for (const id of uniqueIds) {
		if (!result.has(id)) {
			result.set(id, { id, name: "Unknown box", subline: "" });
		}
	}

	return result;
}

export function buildSettingsChangedAuditPayload(args: {
	batchId: string;
	since: Date;
	actionLabel: string;
	boxIds: string[];
	boxMap: Map<string, SettingsChangedAuditBox>;
}): SettingsChangedAuditPayload {
	const orderedBoxes = args.boxIds
		.map((id) => args.boxMap.get(id))
		.filter((box): box is SettingsChangedAuditBox => Boolean(box));

	return {
		batch_id: args.batchId,
		since: args.since.toISOString(),
		timestamp: formatSettingsChangedTimestamp(args.since),
		action_label: args.actionLabel,
		boxes: orderedBoxes,
	};
}

export function deriveActionLabelFromLogs(
	logs: Array<{ metadata?: Record<string, unknown> | null; type?: string }>,
): string {
	for (const log of logs) {
		const label = log.metadata?.settings_action_label;
		if (typeof label === "string" && label.trim()) return label.trim();
	}

	if (logs.length > 0) {
		const formatted = formatHospitalityGrubpacLogAction(logs[0] as any, { floorNames: new Map() });
		if (formatted) return formatted;
	}

	return "Settings updated";
}
