import type { MedicalEmployeeRoleType } from "../common";

export interface MedicalAuthPayload {
	id: string;
	role: MedicalEmployeeRoleType;
	type?: string;
}
