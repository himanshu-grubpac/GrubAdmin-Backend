import { createHandlers } from "@/utils/hono-factory.ts";
import { updateTelemetryValidator, boxIdParamValidator } from "../validators/simulator.validators.ts";
import { updateBoxTelemetry } from "@/db/actions/simulator.actions.ts";
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

		return context.json<APIResponse<{ status: string }>>(
			{
				success: true,
				code: 200,
				message: "State updated successfully",
				data: { status: "success" },
			},
			{ status: 200 }
		);
	}
);
