import type { CAMPING_EMPLOYEE_ROLES } from "@/configs/constants.ts";

export type CampingEmployeeRoleType =
	(typeof CAMPING_EMPLOYEE_ROLES)[number];
