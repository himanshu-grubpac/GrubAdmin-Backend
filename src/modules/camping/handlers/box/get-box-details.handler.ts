import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { prisma } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const getBoxDetailsHandler = createHandlers(
	campingAuthGuard(),
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");

		const box = await prisma.box.findFirst({
			where: {
				id: box_id,
				client_id,
				status: { not: "suspended" },
			},
			include: {
				telemetry: true,
				lock: true,
			},
		});

		if (!box) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const telemetry = box.telemetry;
		const isConnected = telemetry?.connection_status === "connected";

		// Fetch surveillance_mode from MongoDB BoxConfig
		let surveillanceMode = false;
		try {
			const config = await BoxConfig.findOne({ box_id: box.id });
			if (config && config.surveillance_mode !== undefined) {
				surveillanceMode = config.surveillance_mode;
			}
		} catch (err) {
			console.error("Failed to fetch BoxConfig surveillance_mode:", err);
		}

		const formattedDetails = {
			id: box.id,
			box_display_id: box.box_display_id,
			name: box.name || "",
			is_connected: isConnected,
			battery_level: telemetry?.battery_percentage ?? 0,
			is_locked: box.lock?.lock_status === "locked",
			zone1_temp: telemetry?.zone1_temp ?? null,
			zone2_temp: telemetry?.zone2_temp ?? null,
			zone1_target_temp: telemetry?.zone1_target_temp ?? null,
			zone2_target_temp: telemetry?.zone2_target_temp ?? null,
			ext_temp: telemetry?.ext_temp ?? null,
			connection_status: telemetry?.cellular_signal ?? telemetry?.connection_status ?? null,
			power_status: telemetry?.power_status ?? null,
			health_status: telemetry?.health_status ?? null,
			battery_1_level: telemetry?.battery_1_percentage ?? null,
			battery_2_level: telemetry?.battery_2_percentage ?? null,
			is_charging: telemetry?.charging_status === "on",
			wifi_connected: telemetry?.wifi_status === "on",
			bluetooth_available: telemetry?.bluetooth_status === "on",
			is_power_on: telemetry?.power_status === "on",
			gyrosensor_detected: telemetry?.gyrosensor_status === "on",
			is_gps_on: telemetry?.gps_status === "on",
			gps_status: telemetry?.gps_status ?? null,
			sim_status: telemetry?.sim_status ?? null,
			solar_panels_detected: telemetry?.solar_status === "on",
			port_220v_110v_detected: telemetry?.port_big_status === "on",
			port_12v_detected: telemetry?.port_small_status === "on",
			usb_port_detected: null,
			memory_card_usage: telemetry?.memory_percentage ?? null,
			save_to_card_enabled: telemetry?.save_to_memory_status === "on",
			flood_light_detected: telemetry?.light_status === "on",
			surveillance_mode: surveillanceMode,
			settings: {
				name: box.name || "",
				zone1_target_temp: telemetry?.zone1_target_temp ?? null,
				zone2_target_temp: telemetry?.zone2_target_temp ?? null,
				zone1_status: telemetry?.zone1_status ?? "off",
				zone2_status: telemetry?.zone2_status ?? "off",
				ioniser_status: telemetry?.ioniser_status ?? "off",
			},
		};

		return context.json<APIResponse<typeof formattedDetails>>({
			success: true,
			code: 200,
			data: formattedDetails,
		});
	},
);
