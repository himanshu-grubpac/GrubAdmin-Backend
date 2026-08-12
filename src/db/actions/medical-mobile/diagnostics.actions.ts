import type { box_telemetry_latest } from "@/db/types";
import type { MedicalBoxDiagnostics } from "@/types/medical-mobile/diagnostics";

const hardwareLabel = (value: string | null | undefined): string => {
	if (value === "on") return "ON";
	if (value === "off") return "OFF";
	return "UNKNOWN";
};

export const buildMedicalBoxDiagnostics = (
	box: {
		telemetry?: box_telemetry_latest | null;
	},
): MedicalBoxDiagnostics => {
	const t = box.telemetry;

	const statusOrDetected = (value: string | null | undefined) =>
		value === "on" ? "DETECTED" : value === "off" ? "NOT DETECTED" : "UNKNOWN";

	return {
		box: {
			title: "Box",
			items: [
				{
					label: "Status",
					status: box.telemetry?.connection_status?.toUpperCase() ?? "UNKNOWN",
				},
				{ label: "Ioniser", status: hardwareLabel(t?.ioniser_status) },
				{
					label: "Ext. thermostat sensor",
					status: t?.ext_temp != null ? `${t.ext_temp}°C` : "UNKNOWN",
					value: t?.ext_temp ?? null,
				},
			],
		},
		connections: {
			title: "Connections",
			items: [
				{
					label: "Wifi",
					status: t?.wifi_status === "on" ? "CONNECTED" : "NO SIGNAL",
				},
				{
					label: "Bluetooth",
					status: t?.bluetooth_status === "on" ? "STRONG" : "NO SIGNAL",
				},
			],
		},
		power: {
			title: "Power",
			items: [
				{
					label: "Battery",
					status: t?.battery_1_percentage != null ? `${t.battery_1_percentage}%` : "UNKNOWN",
					value: t?.battery_1_percentage ?? null,
				},
				{
					label: "220V/110V port",
					status: statusOrDetected(t?.port_big_status),
				},
			],
		},
		storage: {
			title: "Storage",
			items: [
				{
					label: "Memory card",
					status: t?.memory_percentage != null ? `${t.memory_percentage}%` : "UNKNOWN",
					value: t?.memory_percentage ?? null,
				},
			],
		},
		camera: {
			title: "Camera",
			items: [
				{ label: "BoxCam 360°", status: hardwareLabel(t?.camera_status) },
				{ label: "Turn signals", status: statusOrDetected(t?.turn_signal_status) },
			],
		},
		light: {
			title: "Light",
			items: [{ label: "Warning light", status: statusOrDetected(t?.light_status) }],
		},
	};
};
