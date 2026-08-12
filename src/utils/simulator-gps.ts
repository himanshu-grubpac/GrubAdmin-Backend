import type { box_telemetry_latest } from "@/db/types";

/** GPS is always considered available on simulator boxes (independent of power state). */
export const isSimulatorGpsAvailable = (): boolean => true;

export const resolveSimulatorLatitude = (
	telemetry: box_telemetry_latest | null | undefined,
	bodyLat?: number,
): number | null => {
	if (bodyLat !== undefined) return bodyLat;
	if (telemetry?.latitude != null) return Number(telemetry.latitude);
	return null;
};

export const resolveSimulatorLongitude = (
	telemetry: box_telemetry_latest | null | undefined,
	bodyLng?: number,
): number | null => {
	if (bodyLng !== undefined) return bodyLng;
	if (telemetry?.longitude != null) return Number(telemetry.longitude);
	return null;
};
