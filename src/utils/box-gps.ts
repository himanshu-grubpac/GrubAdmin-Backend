import type { box_telemetry_latest } from "@/db/types";

export type BoxGpsStatus = "on" | "off" | "unavailable";

export interface BoxGpsCoords {
	lat: number;
	lng: number;
	gps_status: BoxGpsStatus;
	updated_at: string | null;
}

/**
 * Resolve box GPS coordinates from telemetry.
 * GPS remains active for location even when the box is powered off;
 * coordinates are returned whenever latitude/longitude are present.
 */
export const resolveBoxGpsCoords = (
	telemetry: box_telemetry_latest | null | undefined,
): BoxGpsCoords => {
	const latRaw = telemetry?.latitude != null ? Number(telemetry.latitude) : null;
	const lngRaw = telemetry?.longitude != null ? Number(telemetry.longitude) : null;
	const updatedAt =
		telemetry?.gps_updated_at?.toISOString() ??
		telemetry?.updated_at?.toISOString() ??
		null;

	if (latRaw == null || lngRaw == null || Number.isNaN(latRaw) || Number.isNaN(lngRaw)) {
		return { lat: 0, lng: 0, gps_status: "unavailable", updated_at: updatedAt };
	}

	return { lat: latRaw, lng: lngRaw, gps_status: "on", updated_at: updatedAt };
};
