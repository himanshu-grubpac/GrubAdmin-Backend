export interface MedicalBoxLocation {
	lat: number;
	lng: number;
	updated_at: string;
	address_hint: string | null;
	gps_status: "on" | "off" | "unavailable";
}

/** Native OS share payload for POST .../location/share (Option A — no web share page). */
export interface MedicalBoxLocationShareResponse extends MedicalBoxLocation {
	maps_url: string;
	share_text: string;
}
