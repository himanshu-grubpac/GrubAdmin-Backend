export interface MedicalEmergencyCallMetadata {
	facility_name: string;
	phone_e164: string;
}

export interface MedicalEmergencyAlertRequest {
	box_id?: string;
	lat: number;
	lng: number;
	note?: string;
}

export interface MedicalEmergencyAlertResponse {
	incident_id: string;
	dispatched_at: string;
}
