import type { MEDICAL_EMPLOYEE_ROLES } from "@/configs/constants.ts";

export type MedicalEmployeeRoleType =
	(typeof MEDICAL_EMPLOYEE_ROLES)[number];
