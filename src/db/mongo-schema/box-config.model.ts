import { model, Schema, type Document } from "mongoose";
import type {
	GrublockStatus as GrublockStatusType,
	SensorStatus as SensorStatusType,
	NetworkConnectionStatus as NetworkConnectionStatusType,
} from "@/types/common";
import {
	GrublockStatus,
	NetworkConnectionStatus,
	SensorStatus,
} from "@/configs/constants";

export type BoxConfigModel = Document & {
	box_id: string;
	client_id: string | null;
	power_on: boolean;
	is_connected: boolean;
	grublock: GrublockStatusType;
	ioniser: boolean;
	dual_zone: boolean;
	ext_thermostat_sensor: number;
	advert_screen: boolean;
	gyrosensor: SensorStatusType;
	wifi_connection: NetworkConnectionStatusType;
	bluetooth_connection: NetworkConnectionStatusType;
	sim_4g_network: NetworkConnectionStatusType;
	gps: boolean;
	battery_level: number;
	solar_panels: SensorStatusType;
	strong_power_port: SensorStatusType;
	weak_power_port: SensorStatusType;
	box_cam_360: boolean;
	adas: boolean;
	turn_signals: SensorStatusType;
	memory_card_storage: number;
	save_to_card: boolean;
	restaurant_id: string | null;
	driver_id: string | null;
	surveillance_mode?: boolean;
};

const boxConfigSchema = new Schema<BoxConfigModel>(
	{
		box_id: {
			type: String,
			required: true,
			unique: true,
		},
		client_id: {
			type: String,
			default: null,
			index: true,
		},
		power_on: {
			type: Boolean,
			default: false,
		},
		is_connected: {
			type: Boolean,
			default: false,
		},
		grublock: {
			type: String,
			enum: GrublockStatus,
			default: "locked",
		},
		ioniser: {
			type: Boolean,
			default: false,
		},
		dual_zone: {
			type: Boolean,
			default: false,
		},
		ext_thermostat_sensor: {
			type: Number,
			default: 0,
		},
		advert_screen: {
			type: Boolean,
			default: false,
		},
		gyrosensor: {
			type: String,
			enum: SensorStatus,
			default: "not_detected",
		},
		wifi_connection: {
			type: String,
			enum: NetworkConnectionStatus,
			default: "no_signal",
		},
		bluetooth_connection: {
			type: String,
			enum: NetworkConnectionStatus,
			default: "no_signal",
		},
		sim_4g_network: {
			type: String,
			enum: NetworkConnectionStatus,
			default: "no_signal",
		},
		gps: {
			type: Boolean,
			default: false,
		},
		battery_level: {
			type: Number,
			default: 0,
		},
		solar_panels: {
			type: String,
			enum: SensorStatus,
			default: "not_detected",
		},
		strong_power_port: {
			type: String,
			enum: SensorStatus,
			default: "not_detected",
		},
		weak_power_port: {
			type: String,
			enum: SensorStatus,
			default: "not_detected",
		},
		box_cam_360: {
			type: Boolean,
			default: false,
		},
		adas: {
			type: Boolean,
			default: false,
		},
		turn_signals: {
			type: String,
			enum: SensorStatus,
			default: "not_detected",
		},
		memory_card_storage: {
			type: Number,
			default: 0,
		},
		save_to_card: {
			type: Boolean,
			default: false,
		},
		restaurant_id: {
			type: String,
			trim: true,
			default: null,
		},
		driver_id: {
			type: String,
			trim: true,
			default: null,
		},
		surveillance_mode: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
		toJSON: {
			transform: (_, returningDoc) => {
				returningDoc["id"] = returningDoc["_id"];
				// @ts-ignore
				delete returningDoc["_id"];
			},
		},
	},
);

export const BoxConfig = model<BoxConfigModel>("box_config", boxConfigSchema);
