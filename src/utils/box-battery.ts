/**
 * A GrubPac box carries two battery cells. The overall battery level reported to
 * clients is the mean of the cells that have actually reported a reading. When
 * neither cell has reported, the level is unknown (null) — never a fabricated
 * default — so consumers can render an explicit "unknown" state.
 */
export const computeOverallBatteryLevel = (
	telemetry:
		| {
				battery_1_percentage?: number | null;
				battery_2_percentage?: number | null;
		  }
		| null
		| undefined,
): number | null => {
	const cells = [
		telemetry?.battery_1_percentage,
		telemetry?.battery_2_percentage,
	].filter((value): value is number => typeof value === "number");

	if (cells.length === 0) return null;

	const total = cells.reduce((sum, value) => sum + value, 0);
	return Math.round(total / cells.length);
};

/** ~24h runtime at 100% battery, scaled linearly. Null when unknown or charging. */
export const computeBatteryEstimatedHours = (
	batteryLevel: number | null,
	isCharging: boolean,
	isPowerOn: boolean,
): number | null => {
	if (batteryLevel == null || !isPowerOn || isCharging) return null;
	return Math.round((batteryLevel / 100) * 24 * 10) / 10;
};
