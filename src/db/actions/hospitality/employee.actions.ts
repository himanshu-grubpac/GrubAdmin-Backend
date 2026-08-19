import type {
	client,
	vertical_hospitality_employee,
} from "@/db/types";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { HospitalityEmployeeRoleType } from "@/types/common";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";
import { logger } from "@/utils/logger";
import { maskAuthEmail } from "hospitality/handlers/auth/auth.utils";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";
import { getVertical } from "@/db/actions/vertical.actions";
import { releaseVerticalEmailsByOwners } from "@/utils/vertical-email-registry";

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

	await prisma.$transaction(async (tx) => {
		await releaseVerticalEmailsByOwners({
			db: tx,
			ownerType: "hospitality_employee",
			ownerIds: foundIds,
		});

		await tx.vertical_hospitality_employee_deleted.createMany({
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

		await tx.vertical_hospitality_employee.deleteMany({
			where: {
				id: { in: foundIds },
				client_id,
			},
		});
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

	const hospitalityVertical =
		email || phone ? await getVertical(HOSPITALITY_VERTICAL_NAME) : null;

	const clientWhere: any = {};
	if (id) clientWhere.id = id;
	if (orConditions.length > 0) clientWhere.OR = orConditions;
	if (hospitalityVertical && (email || phone)) {
		clientWhere.vertical_id = hospitalityVertical.id;
	}

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
	if (hospitalityVertical && (email || phone)) {
		employeeWhere.client = { vertical_id: hospitalityVertical.id };
	}

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
		email: email ? maskAuthEmail(email) : undefined,
		id,
		phone: phone ? "***" : undefined,
		employee_display_id,
	});

	return null;
};

interface UpdateHospitalityAccountProfileArgs {
	id: string;
	type: HospitalityEmployeeRoleType;
	first_name?: string;
	last_name?: string;
	organization?: string;
	email?: string;
	country_code?: string;
	mobile_number?: string;
	password?: string;
	increment_auth_token_version?: boolean;
}

/** Routes profile updates to client (admin) or vertical_hospitality_employee. */
export const updateHospitalityAccountProfile = async (
	args: UpdateHospitalityAccountProfileArgs,
) => {
	const {
		id,
		type,
		first_name,
		last_name,
		organization,
		email,
		country_code,
		mobile_number,
		password,
		increment_auth_token_version,
	} = nullifyEmptyFKs(args);

	if (type === "admin") {
		const clientRecord = await prisma.client.findUnique({
			where: { id },
			select: { vertical_id: true, name: true },
		});

		if (email && clientRecord?.vertical_id) {
			const { assertEmailAvailableInVertical } = await import("@/utils/account");
			try {
				await assertEmailAvailableInVertical(email, clientRecord.vertical_id, {
					excludeClientId: id,
				});
			} catch (error) {
				if (error instanceof APIError && error.code === 409) {
					throw new APIError(
						"This email is already in use by another account.",
						"hospitality.account.EMAIL_EXISTS",
						undefined,
						409,
					);
				}
				throw error;
			}
		}

		const name =
			first_name !== undefined || last_name !== undefined
				? `${first_name ?? ""}${last_name ? ` ${last_name}` : ""}`.trim()
				: undefined;

		return prisma.$transaction(async (tx) => {
			const updated = await tx.client.update({
				where: { id },
				data: {
					email,
					country_code,
					mobile_number,
					organization_name: organization,
					password,
					name,
					...(increment_auth_token_version
						? { auth_token_version: { increment: 1 } }
						: {}),
				},
			});

			if (email && clientRecord?.vertical_id) {
				const { syncVerticalEmailRegistry } = await import("@/utils/vertical-email-registry");
				await syncVerticalEmailRegistry({
					db: tx,
					verticalId: clientRecord.vertical_id,
					email,
					ownerType: "client",
					ownerId: id,
				});
			}

			return updated;
		});
	}

	const employeeRecord = await prisma.vertical_hospitality_employee.findUnique({
		where: { id },
		select: { client: { select: { vertical_id: true } } },
	});

	const verticalId = employeeRecord?.client?.vertical_id;
	if (email) {
		if (!verticalId) {
			throw new APIError("Client vertical is not configured", undefined, undefined, 400);
		}
		const { assertEmailAvailableInVertical } = await import("@/utils/account");
		try {
			await assertEmailAvailableInVertical(email, verticalId, {
				excludeEmployeeId: id,
			});
		} catch (error) {
			if (error instanceof APIError && error.code === 409) {
				throw new APIError(
					"This email is already in use by another account.",
					"hospitality.account.EMAIL_EXISTS",
					undefined,
					409,
				);
			}
			throw error;
		}

		return prisma.$transaction(async (tx) => {
			const updated = await tx.vertical_hospitality_employee.update({
				where: { id },
				data: {
					email,
					first_name,
					last_name,
					country_code,
					mobile_number,
					password,
				},
			});

			const { syncVerticalEmailRegistry } = await import("@/utils/vertical-email-registry");
			await syncVerticalEmailRegistry({
				db: tx,
				verticalId,
				email,
				ownerType: "hospitality_employee",
				ownerId: id,
			});

			return updated;
		});
	}

	return prisma.vertical_hospitality_employee.update({
		where: { id },
		data: {
			first_name,
			last_name,
			country_code,
			mobile_number,
			password,
		},
	});
};
