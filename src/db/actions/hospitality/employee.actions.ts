import type {
	client,
	vertical_hospitality_employee,
} from "@/db/types";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { HospitalityEmployeeRoleType } from "@/types/common";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";
import { logger } from "@/utils/logger";

interface DeleteHospitalityEmployeesArgs {
	ids: string[];
	client_id: string;
}

export const deleteHospitalityEmployees = async (args: DeleteHospitalityEmployeesArgs) => {
	const { ids, client_id } = args;

	const employees = await prisma.vertical_hospitality_employee.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
		include: {
			client: true,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No employees found", undefined, { ids }, 404);
	}

	const foundIds = employees.map((e) => e.id);
	const missingIds = ids.filter((id) => !foundIds.includes(id));

	await prisma.vertical_hospitality_employee_deleted.createMany({
		data: employees.map((e) => ({
			first_name: e.first_name,
			last_name: e.last_name,
			country_code: e.country_code,
			mobile_number: e.mobile_number,
			email: e.email,
			employee_display_id: e.employee_display_id,
			joining_date: e.joining_date,
			client_id: e.client_id,
			client_name: e.client?.name ?? "",
			role_name: e.role,
			profile_pic: e.profile_pic,
			x_primary_key: e.id,
		})),
	});

	await prisma.vertical_hospitality_employee.deleteMany({
		where: {
			id: { in: foundIds },
			client_id,
		},
	});

	return {
		deleted_count: foundIds.length,
		missing_count: missingIds.length,
	};
};

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
