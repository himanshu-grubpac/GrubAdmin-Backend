import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { prisma } from "@/db";

export const getHealthHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const box = await prisma.box.findUnique({
			where: { id: box_id },
			include: { telemetry: true, lock: true },
		});

		if (!box) {
			return context.json<any>({ status: "error", message: "Box not found" }, { status: 404 });
		}

		return context.json<any>(
			{
				status: "success",
				data: {
					box_id: box.id,
					display_id: box.box_display_id,
					is_locked: box.lock?.lock_status === "locked",
					driver_id: box.connection_employee_id || null,
					restaurant_id: null,
					connection_status: box.telemetry?.connection_status || "strong",
					battery_1_level: box.telemetry?.battery_percentage ?? 23,
					battery_2_level: box.telemetry?.battery_percentage ?? 80,
					battery_level: box.telemetry?.battery_percentage ?? 80,
					ambient_temp: box.telemetry?.ext_temp ?? 32,
					zone_1_temp: box.telemetry?.zone1_temp ?? 4.2,
					zone_2_temp: box.telemetry?.zone2_temp ?? 4.5,
					gps_available: box.telemetry?.gps_status === "on",
					latitude: 28.6139,
					longitude: 77.209,
					solar_panel: box.telemetry?.solar_status === "on",
					"220V_110V_port": box.telemetry?.port_big_status === "on",
					Memorycard_used: box.telemetry?.memory_percentage ? box.telemetry.memory_percentage / 100 : 0.15,
					gyrosensor: box.telemetry?.gyrosensor_status === "on" ? "detected" : "not_detected",
					turn_signals: box.telemetry?.turn_signal_status === "on" ? "detected" : "not_detected",
					is_dual_zone: box.telemetry?.dual_zone_status === "on",
					settings: {
						is_power_on: box.telemetry?.power_status === "on",
						is_dual_zone: box.telemetry?.dual_zone_status === "on",
						zone_1_target_temp: box.telemetry?.zone1_temp || 4,
						zone_2_target_temp: box.telemetry?.zone2_temp || 4,
						zone_1_status: true,
						zone_2_status: false,
						saveToCard: box.telemetry?.save_to_memory_status === "on",
						Adas: box.telemetry?.adas_status === "on",
						BoxCam: box.telemetry?.camera_status === "on",
						advert_screen: box.telemetry?.advert_screen_status === "on",
						ioniser: box.telemetry?.ioniser_status === "on",
						light_status: box.telemetry?.light_status === "on"
					}
				}
			},
			{ status: 200 }
		);
	}
);
