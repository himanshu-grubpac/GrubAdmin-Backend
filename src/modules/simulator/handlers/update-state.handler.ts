import { createHandlers } from "@/utils/hono-factory.ts";
import { updateTelemetryValidator, boxIdParamValidator } from "../validators/simulator.validators.ts";
import { updateBoxTelemetry } from "@/db/actions/simulator.actions.ts";
import { prisma } from "@/db";
import type { APIResponse } from "@/types/api";

export const updateStateHandler = createHandlers(
	boxIdParamValidator,
	updateTelemetryValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const body = context.req.valid("json");

		// Map simulator payload to DB schema
		const mappedData: any = {};
		
		if (body.connection_status !== undefined) mappedData.connection_status = body.connection_status;
		if (body.battery_level !== undefined) mappedData.battery_percentage = body.battery_level;
		if (body.battery_1_level !== undefined) mappedData.battery_percentage = body.battery_1_level; // Fallback if 1 is provided
		if (body.zone_1_temp !== undefined) mappedData.zone1_temp = body.zone_1_temp;
		if (body.zone_2_temp !== undefined) mappedData.zone2_temp = body.zone_2_temp;
		if (body.ambient_temp !== undefined) mappedData.ext_temp = body.ambient_temp;
		
		if (body.is_power_on !== undefined) mappedData.power_status = body.is_power_on ? "on" : "off";
		if (body.bluetooth_available !== undefined) mappedData.bluetooth_status = body.bluetooth_available ? "on" : "off";
		if (body.wifi_connected !== undefined) mappedData.wifi_status = body.wifi_connected ? "on" : "off";
		if (body.gps_available !== undefined) mappedData.gps_status = body.gps_available ? "on" : "off";
		if (body.solar_panel !== undefined) mappedData.solar_status = body.solar_panel ? "on" : "off";
		
		if (body.BoxCam !== undefined) mappedData.camera_status = body.BoxCam ? "on" : "off";
		if (body.advert_screen !== undefined) mappedData.advert_screen_status = body.advert_screen ? "on" : "off";
		if (body.ioniser !== undefined) mappedData.ioniser_status = body.ioniser ? "on" : "off";
		if (body.light_status !== undefined) mappedData.light_status = body.light_status ? "on" : "off";
		
		if (body.gyrosensor !== undefined) mappedData.gyrosensor_status = body.gyrosensor === "detected" ? "on" : "off";
		if (body.turn_signals !== undefined) mappedData.turn_signal_status = body.turn_signals === "detected" ? "on" : "off";

		await updateBoxTelemetry(box_id, mappedData);

		const box = await prisma.box.findUnique({
			where: { id: box_id },
			include: { telemetry: true, lock: true },
		});

		if (!box) {
			return context.json<any>(
				{ status: "error", message: "Box not found" },
				{ status: 404 }
			);
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
					settings: {
						is_power_on: box.telemetry?.power_status === "on",
						is_dual_zone: false, // Default or fetch if available
						zone_1_target_temp: box.telemetry?.zone1_temp || 4,
						zone_2_target_temp: box.telemetry?.zone2_temp || 4,
						zone_1_status: true,
						zone_2_status: false,
						saveToCard: true,
						Adas: true,
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
