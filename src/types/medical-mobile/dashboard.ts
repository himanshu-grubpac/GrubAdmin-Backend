import type { MobileBoxSummary } from "@/types/mobile-box";

export interface MedicalMobileDashboardData {
	is_password_set: boolean;
	has_boxes: boolean;
	greeting: string;
	location_name: string | null;
	outside_temp_c: number | null;
	boxes: MobileBoxSummary[];
}
