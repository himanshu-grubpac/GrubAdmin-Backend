export interface MedicalOwnerDashboardBoxCard {
	id: string;
	display_id: string;
	connection_status: string;
	grublock_status: string;
}

export interface MedicalOwnerDashboardData {
	is_password_set: boolean;
	has_boxes: boolean;
	greeting: string;
	location: string | null;
	outside_temp_c: number | null;
	boxes: MedicalOwnerDashboardBoxCard[];
}
