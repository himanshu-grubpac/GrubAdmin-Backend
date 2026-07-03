import type {
	client,
	vertical_hospitality_employee,
} from "@/db/types";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { HospitalityEmployeeRoleType } from "@/types/common";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";
import { logger } from "@/utils/logger";

interface GetUniqueHospitalityEmployeeArgs {
	email?: string;
	phone?: string;
	id?: string;
	employee_display_id?: string;
}

export type GetUniqueHospitalityEmployeeResponse =
	| ({
		type: "admin";
	} & {
		employee: client;
	})
	| ({
		type: HospitalityEmployeeRoleType;
	} & {
		employee: vertical_hospitality_employee;
	})
	| null;

export const getUniqueHospitalityEmployee = async (
	args: GetUniqueHospitalityEmployeeArgs,
): Promise<GetUniqueHospitalityEmployeeResponse> => {
	const { id, email, phone, employee_display_id } = args;

	const orConditions = [
		email ? { email: email } : {},
		phone ? { mobile_number: phone } : {},
	].filter((condition) => Object.keys(condition).length > 0);

	const clientWhere: any = {};
	if (id) clientWhere.id = id;
	if (orConditions.length > 0) clientWhere.OR = orConditions;

	const clientRecord = Object.keys(clientWhere).length > 0
		? await prisma.client.findFirst({ where: clientWhere })
		: null;

	if (clientRecord) {
		return {
			type: "admin",
			employee: clientRecord,
		};
	}

	const employeeWhere: any = {};
	if (id) employeeWhere.id = id;
	if (employee_display_id) employeeWhere.employee_display_id = employee_display_id;
	if (orConditions.length > 0) employeeWhere.OR = orConditions;

	const hospitalityEmployee = Object.keys(employeeWhere).length > 0
		? await prisma.vertical_hospitality_employee.findFirst({ where: employeeWhere })
		: null;

	if (hospitalityEmployee) {
		return {
			type: hospitalityEmployee.role as HospitalityEmployeeRoleType,
			employee: hospitalityEmployee,
		};
	}

	logger.warn(`[Auth] getUniqueHospitalityEmployee returned null`, {
		email,
		id,
		phone,
		employee_display_id,
	});

	return null;
};
