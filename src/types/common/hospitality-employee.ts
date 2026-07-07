import type { HOSPITALITY_EMPLOYEE_ROLES } from "@/configs/constants.ts";

export type HospitalityEmployeeRoleType =
	(typeof HOSPITALITY_EMPLOYEE_ROLES)[number];
