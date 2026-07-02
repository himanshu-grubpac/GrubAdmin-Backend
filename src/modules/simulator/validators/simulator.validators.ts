import { zValidator } from "@hono/zod-validator";
import { validatorErrorHandler } from "@/utils/zod";
import { z } from "zod";

export const boxIdParamValidator = zValidator(
	"param",
	z.object({
		box_id: z.string(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}
);

export const updateTelemetryValidator = zValidator(
	"json",
	z.object({
		connection_status: z.enum(["strong", "weak", "offline", "unknown"]).optional(),
		battery_1_level: z.number().optional(),
		battery_2_level: z.number().optional(),
		battery_level: z.number().optional(),
		zone_1_temp: z.number().optional(),
		zone_1_target_temp: z.number().optional(),
		zone_2_temp: z.number().optional(),
		zone_2_target_temp: z.number().optional(),
		ambient_temp: z.number().optional(),
		is_power_on: z.boolean().optional(),
		bluetooth_available: z.boolean().optional(),
		wifi_connected: z.boolean().optional(),
		cellular_active: z.boolean().optional(),
		zone_1_status: z.boolean().optional(),
		zone_2_status: z.boolean().optional(),
		is_dual_zone: z.boolean().optional(),
		gps_available: z.boolean().optional(),
		latitude: z.number().optional(),
		longitude: z.number().optional(),
		solar_panel: z.boolean().optional(),
		"220V/110V_port": z.boolean().optional(),
		Memorycard_used: z.number().optional(),
		saveToCard: z.boolean().optional(),
		Adas: z.boolean().optional(),
		BoxCam: z.boolean().optional(),
		advert_screen: z.boolean().optional(),
		ioniser: z.boolean().optional(),
		light_status: z.boolean().optional(),
		gyrosensor: z.enum(["detected", "not_detected", "unknown"]).optional(),
		turn_signals: z.enum(["detected", "not_detected", "unknown"]).optional(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}
);

export const triggerAlertValidator = zValidator(
	"json",
	z.object({
		box_id: z.string(),
		category: z.string(),
		type: z.string(),
		title: z.string(),
		description: z.string(),
	}),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}
);
