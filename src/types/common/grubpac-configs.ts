import type {
	GrublockStatus,
	SensorStatus,
	NetworkConnectionStatus,
} from "@/configs/constants";

export type GrublockStatus = (typeof GrublockStatus)[number];
export type SensorStatus = (typeof SensorStatus)[number];
export type NetworkConnectionStatus = (typeof NetworkConnectionStatus)[number];
