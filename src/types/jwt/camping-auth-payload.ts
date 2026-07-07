import type { CampingEmployeeRoleType } from "../common";

export interface CampingAuthPayload {
	id: string;
	role: CampingEmployeeRoleType;
	type?: string;
}
