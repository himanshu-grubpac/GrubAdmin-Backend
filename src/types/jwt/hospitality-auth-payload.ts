import type { HospitalityEmployeeRoleType } from "../common";

export interface HospitalityAuthPayload {
	id: string;
	role: HospitalityEmployeeRoleType;
	type?: string;
	is_impersonation?: boolean;
	admin_id?: string;
	token_version?: number;
}
