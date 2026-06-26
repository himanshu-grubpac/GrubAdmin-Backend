export interface MobileBoxSummary {
	id: string;
	box_display_id: string;
	name: string;
	is_connected: boolean;
	battery_level: number;
	is_locked: boolean;
}

export interface MobileBoxSettings {
	is_dual_zone: boolean;
	zone_1_temp: number | null;
	zone_2_temp: number | null;
	advert_display_enabled: boolean;
	ioniser_enabled: boolean;
	light_enabled: boolean;
}

export interface MobileBoxDetails extends MobileBoxSummary {
	zone_1_temp: number | null;
	zone_2_temp: number | null;
	ext_temp: number | null;
	connection_status: string | null;
	power_status: string | null;
	health_status: string | null;
	settings: MobileBoxSettings;
}

export interface MobileBoxSettingsPatch {
	is_dual_zone?: boolean;
	zone_1_temp?: number;
	zone_2_temp?: number;
	advert_display_enabled?: boolean;
	ioniser_enabled?: boolean;
	light_enabled?: boolean;
}

export interface MobileBoxSettingsUpdateResult {
	id: string;
	box_display_id: string;
	settings: MobileBoxSettings;
}

export interface MobileBoxConnectionResult {
	id: string;
	box_display_id: string;
	is_connected: boolean;
}

export type LockAction = "unlock" | "lock";
