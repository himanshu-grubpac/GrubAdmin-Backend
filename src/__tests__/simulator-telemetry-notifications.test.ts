import { describe, expect, mock, test } from "bun:test";

mock.module("@/db", () => ({ prisma: {} }));

const {
	evaluateSimulatorTelemetryNotifications,
	getLockTransitionNotification,
} = await import("@/db/actions/simulator.actions.ts");

const snapshot = (overrides: Record<string, unknown> = {}) => ({
	battery_percentage: 80,
	battery_1_percentage: 80,
	battery_2_percentage: 80,
	cellular_signal: "strong",
	memory_percentage: 40,
	zone1_temp: 4,
	zone1_target_temp: 4,
	zone2_temp: 4,
	zone2_target_temp: 4,
	zone1_status: "on",
	zone2_status: "on",
	power_status: "on",
	charging_status: "off",
	bluetooth_status: "on",
	wifi_status: "on",
	gps_status: "on",
	solar_status: "on",
	port_big_status: "on",
	save_to_memory_status: "on",
	adas_status: "on",
	camera_status: "on",
	advert_screen_status: "on",
	ioniser_status: "on",
	light_status: "on",
	dual_zone_status: "on",
	gyrosensor_status: "on",
	turn_signal_status: "on",
	...overrides,
});

const evaluate = (
	previousOverrides: Record<string, unknown>,
	updatedOverrides: Record<string, unknown>,
	input: Record<string, unknown>,
) => evaluateSimulatorTelemetryNotifications(
	snapshot(previousOverrides),
	snapshot(updatedOverrides),
	input,
);

describe("simulator telemetry transition notifications", () => {
	describe("battery", () => {
		test("alerts on a direct aggregate battery_level transition to 20", () => {
			expect(evaluate(
				{ battery_percentage: 21 },
				{ battery_percentage: 20 },
				{ battery_level: 20 },
			)).toMatchObject([{ category: "battery", type: "warning" }]);
		});

		test("uses the average of supplied cell readings", () => {
			expect(evaluate(
				{ battery_1_percentage: 30, battery_2_percentage: 30 },
				{ battery_1_percentage: 5, battery_2_percentage: 15 },
				{ battery_1_level: 5, battery_2_level: 15 },
			)).toMatchObject([{ category: "battery", type: "error" }]);
		});

		test("emits only the most severe crossed band and deduplicates ongoing bands", () => {
			expect(evaluate(
				{ battery_percentage: 50 },
				{ battery_percentage: 10 },
				{ battery_level: 10 },
			)).toHaveLength(1);
			expect(evaluate(
				{ battery_percentage: 20 },
				{ battery_percentage: 10 },
				{ battery_level: 10 },
			)).toMatchObject([{ type: "error" }]);
			expect(evaluate(
				{ battery_percentage: 9 },
				{ battery_percentage: 8 },
				{ battery_level: 8 },
			)).toHaveLength(0);
		});

		test("does not recover critical into warning and recovers only above 25", () => {
			expect(evaluate(
				{ battery_percentage: 10 },
				{ battery_percentage: 15 },
				{ battery_level: 15 },
			)).toHaveLength(0);
			expect(evaluate(
				{ battery_percentage: 10 },
				{ battery_percentage: 25 },
				{ battery_level: 25 },
			)).toHaveLength(0);
			expect(evaluate(
				{ battery_percentage: 10 },
				{ battery_percentage: 26 },
				{ battery_level: 26 },
			)).toMatchObject([{ type: "success" }]);
		});
	});

	describe("connection and storage", () => {
		test("maps connection transitions and suppresses unchanged state", () => {
			expect(evaluate(
				{ cellular_signal: "strong" },
				{ cellular_signal: "weak" },
				{ connection_status: "weak" },
			)).toMatchObject([{ type: "warning" }]);
			expect(evaluate(
				{ cellular_signal: "weak" },
				{ cellular_signal: "offline" },
				{ connection_status: "offline" },
			)).toMatchObject([{ type: "error" }]);
			expect(evaluate(
				{ cellular_signal: "offline" },
				{ cellular_signal: "strong" },
				{ connection_status: "strong" },
			)).toMatchObject([{ type: "success" }]);
			expect(evaluate(
				{ cellular_signal: "strong" },
				{ cellular_signal: "strong" },
				{ connection_status: "strong" },
			)).toHaveLength(0);
		});

		test("warns at 90 percent and recovers below 85 without repeats", () => {
			expect(evaluate(
				{ memory_percentage: 89 },
				{ memory_percentage: 90 },
				{ Memorycard_used: 0.9 },
			)).toMatchObject([{ type: "warning" }]);
			expect(evaluate(
				{ memory_percentage: 90 },
				{ memory_percentage: 95 },
				{ Memorycard_used: 0.95 },
			)).toHaveLength(0);
			expect(evaluate(
				{ memory_percentage: 95 },
				{ memory_percentage: 84 },
				{ Memorycard_used: 0.84 },
			)).toMatchObject([{ type: "success" }]);
		});
	});

	describe("temperature", () => {
		test("evaluates zones independently with hysteresis", () => {
			const notifications = evaluate(
				{ zone1_temp: 4, zone2_temp: 12 },
				{ zone1_temp: 9, zone2_temp: 6 },
				{ zone_1_temp: 9, zone_2_temp: 6 },
			);
			expect(notifications).toHaveLength(2);
			expect(notifications[0]).toMatchObject({ type: "warning", title: "Zone 1 temperature deviation" });
			expect(notifications[1]).toMatchObject({ type: "success", title: "Zone 2 temperature recovered" });
		});

		test("does not evaluate a zone explicitly turned off", () => {
			expect(evaluate(
				{ zone1_temp: 4, zone1_status: "on" },
				{ zone1_temp: 20, zone1_status: "off" },
				{ zone_1_temp: 20, zone_1_status: false },
			).filter((item) => item.title.includes("temperature"))).toHaveLength(0);
		});

		test("does not repeat while outside the allowed band", () => {
			expect(evaluate(
				{ zone1_temp: 10 },
				{ zone1_temp: 11 },
				{ zone_1_temp: 11 },
			)).toHaveLength(0);
		});
	});

	describe("hardware and collapsed enum states", () => {
		test("maps hardware transitions to their categories and severity", () => {
			const notifications = evaluate(
				{},
				{ power_status: "off", camera_status: "off", advert_screen_status: "off" },
				{ is_power_on: false, BoxCam: false, advert_screen: false },
			);
			expect(notifications).toMatchObject([
				{ category: "other", type: "error" },
				{ category: "camera", type: "warning" },
				{ category: "display", type: "warning" },
			]);
		});

		test("emits success on enable and suppresses unchanged hardware", () => {
			expect(evaluate(
				{ bluetooth_status: "off" },
				{ bluetooth_status: "on" },
				{ bluetooth_available: true },
			)).toMatchObject([{ type: "success" }]);
			expect(evaluate(
				{ bluetooth_status: "on" },
				{ bluetooth_status: "on" },
				{ bluetooth_available: true },
			)).toHaveLength(0);
		});

		test("alerts reliably for collapsed enum transitions and deduplicates persisted off", () => {
			expect(evaluate(
				{ gyrosensor_status: "on" },
				{ gyrosensor_status: "off" },
				{ gyrosensor: "error" },
			)).toMatchObject([{ type: "error" }]);
			expect(evaluate(
				{ gyrosensor_status: "off" },
				{ gyrosensor_status: "off" },
				{ gyrosensor: "error" },
			)).toHaveLength(0);
			expect(evaluate(
				{ turn_signal_status: "off" },
				{ turn_signal_status: "on" },
				{ turn_signals: "detected" },
			)).toMatchObject([{ type: "success" }]);
		});
	});

	test("returns multiple distinct notifications from one telemetry update", () => {
		const notifications = evaluate(
			{ battery_percentage: 50, cellular_signal: "strong", memory_percentage: 40 },
			{ battery_percentage: 10, cellular_signal: "offline", memory_percentage: 95 },
			{ battery_level: 10, connection_status: "offline", Memorycard_used: 0.95 },
		);
		expect(notifications).toHaveLength(3);
		expect(notifications.map((item) => item.title)).toEqual([
			"Critical battery level",
			"Connection offline",
			"Storage nearly full",
		]);
	});
});

describe("simulator lock transition notifications", () => {
	test("notifies only when the persisted lock state changes", () => {
		expect(getLockTransitionNotification("unlocked", "locked")).toMatchObject({
			category: "lock",
			type: "notification",
		});
		expect(getLockTransitionNotification("locked", "locked")).toBeNull();
		expect(getLockTransitionNotification("locked", "unlocked")).toMatchObject({
			category: "lock",
			type: "success",
		});
	});
});
