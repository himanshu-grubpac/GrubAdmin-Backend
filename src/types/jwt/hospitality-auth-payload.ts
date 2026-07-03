import type { HospitalityEmployeeRoleType } from "../common";

export interface HospitalityAuthPayload {
	id: string;
	role: HospitalityEmployeeRoleType;
	type?: string;
}
