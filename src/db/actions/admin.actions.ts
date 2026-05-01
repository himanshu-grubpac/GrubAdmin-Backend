import { prisma } from "..";
import {
	type admin,
	type admin_dismissed,
	type Prisma,
	type role,
} from "@/db/types";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { APIError } from "@/types/error";

interface GetUniqueAdminArgs {
	email?: string;
	id?: string;
	adminSelect?: Prisma.adminSelect;
	employeeOmit?: Prisma.adminOmit;
}

export interface AdminWithRole extends admin {
	role?: role | null;
}

interface GetUniqueAdminResponse {
	user: AdminWithRole;
	type: "admin" | "employee";
}

export const getUniqueAdmin = async (
	args: GetUniqueAdminArgs,
): Promise<GetUniqueAdminResponse | null> => {
	if (!args.email && !args.id) {
		throw new Error(
			"Please provide either email or id while calling getUniqueAdmin function",
		);
	}

	if (args.employeeOmit && args.adminSelect) {
		throw new Error(
			"Select and omit cannot be part of the same query in employee",
		);
	}

	let employeeWhereQuery: Prisma.adminWhereUniqueInput | null = null;

	if (args.id) {
		employeeWhereQuery = {
			id: args.id,
		};
	} else if (args.email) {
		employeeWhereQuery = {
			email: args.email,
		};
	}

	if (employeeWhereQuery === null) {
		throw Error("Where query cannot be null");
	}

	const employee = args.adminSelect
		? await prisma.admin.findUnique({
				where: employeeWhereQuery,
				select: args.adminSelect,
			})
		: await prisma.admin.findUnique({
				where: employeeWhereQuery,
				omit: args.employeeOmit,
				include: {
					role: true,
				},
			});

	if (employee) {
		return {
			user: employee,
			type: employee?.role?.is_super_admin ? "admin" : "employee",
		};
	}

	return null;
};

interface UpdateAdminArgs {
	data: Prisma.adminUpdateInput;
	id?: string;
	email?: string;
}

export const updateAdmin = async (args: UpdateAdminArgs) => {
	if (!args.id && !args.email) {
		throw new Error(
			"Please provide either an id or an email to update the the data",
		);
	}

	let adminWhereQuery: Prisma.adminWhereUniqueInput | null = null;

	if (args.id) {
		adminWhereQuery = {
			id: args.id,
		};
	} else if (args.email) {
		adminWhereQuery = {
			email: args.email,
		};
	}

	if (adminWhereQuery === null) {
		throw Error("Where query cannot be null");
	}

	return prisma.admin.update({
		where: adminWhereQuery,
		data: args.data,
		omit: {
			password: true,
		},
	});
};

interface SetNewPasswordArgs {
	new_password: string;
	id: string;
}

export const setNewPassword = async (args: SetNewPasswordArgs) => {
	const hashedPassword = await Bcrypt.generateHash({
		data: args.new_password,
		saltLength: 10,
	});

	return prisma.admin.update({
		where: {
			id: args.id,
		},
		data: {
			password: hashedPassword,
		},
		omit: {
			password: true,
		},
	});
};

interface CreateAdminArgs {
	email: string;
	first_name: string;
	last_name?: string;
	mobile_number?: string;
	country_code?: string;
	location?: string;
	joining_date?: Date;
	role_id?: string;
	employee_id?: string;
}

export const createAdmin = async (args: CreateAdminArgs) => {
	if (args.mobile_number && !args.country_code) {
		throw new APIError(
			"You must provide a country code for each mobile number",
			undefined,
			undefined,
			400,
		);
	}

	return prisma.admin.create({
		data: {
			...args,
			role_id: args.role_id,
		},
		include: {
			role: true,
		},
	});
};

interface GetAdminsResponse {
	admins: admin[];
	count: number;
}

interface GetAdminsArgs {
	query?: string;
	role_id?: string[];
	pageSize?: number;
	pageNumber?: number;
	status?: "active" | "unassigned" | "suspended";
	fetchAll?: boolean;
	excludeRoles?: boolean;
	ids?: string[];
	onlySuperAdmins?: boolean;
}

export const getAdmins = async (
	args: GetAdminsArgs,
): Promise<GetAdminsResponse> => {
	const {
		pageNumber,
		pageSize,
		role_id,
		query,
		status,
		fetchAll,
		excludeRoles,
		ids,
	} = args;

	const adminsQuery: Prisma.adminFindManyArgs = {
		where: {
			id: ids
				? {
						in: ids,
					}
				: undefined,
			OR: query
				? [
						{
							first_name: {
								contains: query,
							},
						},
						{
							last_name: {
								contains: query,
							},
						},
						{
							email: {
								contains: query,
							},
						},
						{
							mobile_number: {
								contains: query,
							},
						},
						{
							location: {
								contains: query,
							},
						},
					]
				: undefined,
			status:
				status === "active"
					? {
							in: ["active", "unassigned"],
						}
					: status,
			role_id: role_id
				? {
						in: role_id,
					}
				: undefined,
			role: args.onlySuperAdmins
				? {
						is_super_admin: true,
					}
				: undefined,
		},
		take: !fetchAll ? pageSize : undefined,
		skip:
			pageNumber && pageSize && !fetchAll
				? (pageNumber - 1) * pageSize
				: undefined,
		omit: {
			password: true,
		},
		include: !excludeRoles
			? {
					role: true,
				}
			: undefined,
	};

	const [adminsResponse, adminsCountResponse] = await Promise.allSettled([
		prisma.admin.findMany(adminsQuery),
		prisma.admin.count({
			where: adminsQuery.where,
		}),
	]);

	if (adminsResponse.status === "rejected") {
		throw new APIError(String(adminsResponse.reason), undefined, undefined, 400);
	}

	if (adminsCountResponse.status === "rejected") {
		throw new APIError(String(adminsCountResponse.reason), undefined, undefined, 400);
	}

	return {
		admins: adminsResponse.value,
		count: adminsCountResponse.value,
	};
};

interface AssignBulkRoleArgs {
	role_id: string;
	admin_ids: string[];
}

export const assignBulkRole = async (args: AssignBulkRoleArgs) => {
	return prisma.admin.updateMany({
		where: {
			id: {
				in: args.admin_ids,
			},
		},
		data: {
			role_id: args.role_id,
		},
	});
};

interface ToggleSuspendAdminsArgs {
	admin_ids: string[];
	state: "active" | "suspended";
}

export const toggleSuspendAdmins = async (args: ToggleSuspendAdminsArgs) => {
	return prisma.admin.updateMany({
		where: {
			id: {
				in: args.admin_ids,
			},
		},
		data: {
			status: args.state,
		},
	});
};

export const deleteAdmins = async (adminIds: string[]) => {
	const admins = await prisma.admin.findMany({
		where: {
			id: {
				in: adminIds,
			},
		},
		include: {
			role: true,
		},
	});

	if (!admins) {
		throw new APIError(undefined, "admin.auth.ACCOUNT_NOT_FOUND", undefined, 404);
	}

	const dismissedAdmins = await prisma.admin_dismissed.createMany({
		data: admins.map((a) => ({
			first_name: a.first_name,
			last_name: a.last_name,
			password: a.password,
			mobile_number: a.mobile_number,
			country_code: a.country_code,
			email: a.email,
			location: a.location,
			joining_date: a.joining_date,
			role: a.role?.name,
		})),
	});

	if (dismissedAdmins.count !== admins.length) {
		throw new APIError("Admin deletion failed", undefined, undefined, 400);
	}

	return prisma.admin.deleteMany({
		where: {
			id: {
				in: adminIds,
			},
		},
	});
};

interface GetDismissedAdminsArgs {
	query?: string;
	role?: string[];
	pageSize?: number;
	pageNumber?: number;
	excludeRoles?: boolean;
	fetchAll?: boolean;
}

interface GetDismissedAdminsResponse {
	admins: admin_dismissed[];
	count: number;
}

export const getDismissedAdmins = async (
	args: GetDismissedAdminsArgs,
): Promise<GetDismissedAdminsResponse> => {
	const { pageNumber, pageSize, role, query, fetchAll } = args;

	const adminsQuery: Prisma.admin_dismissedFindManyArgs = {
		where: {
			OR: query
				? [
						{
							first_name: {
								contains: query,
							},
						},
						{
							last_name: {
								contains: query,
							},
						},
						{
							email: {
								contains: query,
							},
						},
						{
							mobile_number: {
								contains: query,
							},
						},
						{
							location: {
								contains: query,
							},
						},
					]
				: undefined,
			role: role
				? {
						in: role,
					}
				: undefined,
		},
		take: !fetchAll ? pageSize : undefined,
		skip:
			pageNumber && pageSize && !fetchAll
				? (pageNumber - 1) * pageSize
				: undefined,
		omit: {
			password: true,
		},
	};

	const [adminsResponse, adminsCountResponse] = await Promise.allSettled([
		prisma.admin_dismissed.findMany(adminsQuery),
		prisma.admin_dismissed.count({
			where: adminsQuery.where,
		}),
	]);

	if (adminsResponse.status === "rejected") {
		throw new APIError(String(adminsResponse.reason), undefined, undefined, 400);
	}

	if (adminsCountResponse.status === "rejected") {
		throw new APIError(String(adminsCountResponse.reason), undefined, undefined, 400);
	}

	return {
		admins: adminsResponse.value,
		count: adminsCountResponse.value,
	};
};
