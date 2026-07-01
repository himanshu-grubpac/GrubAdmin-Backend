import type {
	client,
	vertical_medical_employee,
} from "@/db/types";
import { prisma } from "@/db";
import { APIError } from "@/types/error";
import type { MedicalEmployeeRoleType } from "@/types/common";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";
import { logger } from "@/utils/logger";

interface GetUniqueMedicalEmployeeArgs {
	email?: string;
	phone?: string;
	id?: string;
	employee_display_id?: string;
}

export type GetUniqueMedicalEmployeeResponse =
	| ({
		type: "admin";
	} & {
		employee: client;
	})
	| ({
		type: MedicalEmployeeRoleType;
	} & {
		employee: vertical_medical_employee;
	})
	| null;

export const getUniqueMedicalEmployee = async (
	args: GetUniqueMedicalEmployeeArgs,
): Promise<GetUniqueMedicalEmployeeResponse> => {
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

	const medicalEmployee = Object.keys(employeeWhere).length > 0
		? await prisma.vertical_medical_employee.findFirst({ where: employeeWhere })
		: null;

	if (medicalEmployee) {
		return {
			type: medicalEmployee.role as MedicalEmployeeRoleType,
			employee: medicalEmployee,
		};
	}

	logger.warn(`[Auth] getUniqueMedicalEmployee returned null`, {
		email,
		id,
		phone,
		employee_display_id,
	});

	return null;
};

interface ActivateMedicalEmployeeArgs {
	email?: string;
	id?: string;
	type: MedicalEmployeeRoleType;
}

export const activateMedicalEmployee = async (
	args: ActivateMedicalEmployeeArgs,
) => {
	const { email, id, type } = args;

	if (type === "admin") {
		const clientRecord = await prisma.client.findUnique({
			where: { id },
			select: { id: true, vertical_id: true, email: true, status: true },
		});

		if (!clientRecord) {
			throw new APIError("Client not found for activation", undefined, undefined, 404);
		}

		return prisma.client.update({
			where: {
				id,
				vertical_id_email: email && clientRecord.vertical_id
					? {
						email,
						vertical_id: clientRecord.vertical_id,
					}
					: undefined,
				status: "inactive",
			},
			data: {
				status: "active",
			},
		});
	} else {
		return prisma.vertical_medical_employee.update({
			where: {
				id,
				email,
			},
			data: {
				status: "active",
			},
		});
	}
};

type UpdateMedicalEmployeeArgs = {
	id: string;
	email?: string;
	country_code?: string;
	mobile_number?: string;
	password?: string;
	first_name?: string;
	last_name?: string;
	status?: "active" | "suspended";
} & (
		| {
			type: "admin";
			organization?: string;
		}
		| {
			type: MedicalEmployeeRoleType;
			department_id?: string;
		}
	);

export const updateMedicalEmployee = async (
	args: UpdateMedicalEmployeeArgs,
) => {
	args = nullifyEmptyFKs(args);
	const {
		id,
		country_code,
		email,
		type,
		first_name,
		last_name,
		mobile_number,
		password,
		status,
	} = args;

	const { department_id } = args as any;

	if (type === "admin") {
		if (email) {
			const existingClient = await prisma.client.findFirst({
				where: {
					email,
					NOT: {
						id,
					},
				},
			});

			if (existingClient) {
				throw new APIError(undefined, "medical.common.EMAIL_ALREADY_EXISTS");
			}
		}

		return prisma.client.update({
			where: {
				id,
			},
			data: {
				status,
				email,
				country_code,
				mobile_number,
				organization_name: type === "admin" && "organization" in args ? args.organization : undefined,
				password,
				name: first_name || last_name
					? `${first_name ? first_name : ""}${last_name ? ` ${last_name}` : ""}`
					: undefined,
			},
		});
	}

	if (email) {
		const existingEmployee = await prisma.vertical_medical_employee.findFirst({
			where: {
				email,
				NOT: {
					id,
				},
			},
		});

		if (existingEmployee) {
			throw new APIError(undefined, "medical.common.EMAIL_ALREADY_EXISTS");
		}
	}

	return prisma.vertical_medical_employee.update({
		where: {
			id,
		},
		data: {
			status,
			email,
			first_name,
			last_name,
			country_code,
			mobile_number,
			department_id,
			password,
		},
	});
};

interface CreateMedicalEmployeeArgs {
	first_name: string;
	last_name: string;
	country_code: string;
	mobile_number: string;
	email: string;
	employee_display_id: string;
	joining_date: Date;
	role: "manager" | "handler";
	department_id?: string | null;
	client_id: string;
}

export const createMedicalEmployee = async (
	args: CreateMedicalEmployeeArgs,
) => {
	args = nullifyEmptyFKs(args);

	const {
		client_id,
		email,
		employee_display_id,
		department_id,
		first_name,
		last_name,
		country_code,
		mobile_number,
		joining_date,
		role,
	} = args;

	if (department_id) {
		const department = await prisma.vertical_medical_department.findUnique({
			where: {
				id: department_id,
			},
			include: {
				employees: {
					where: {
						role: "manager",
						status: "active",
					},
				},
			},
		});

		if (!department) {
			throw new APIError("No department found to be assigned!", undefined, undefined, 404);
		}

		if (department.client_id !== client_id) {
			throw new APIError(undefined, "medical.common.DEPARTMENT_OWNERSHIP_MISMATCH");
		}

		if (role === "manager" && department.employees && department.employees.length > 0) {
			throw new APIError(undefined, "medical.common.DEPARTMENT_HAS_MANAGER");
		}
	}

	const client = await prisma.client.findUnique({
		where: {
			id: client_id,
		},
	});

	if (!client) {
		throw new APIError("No client found!", undefined, undefined, 404);
	}

	if (client.email === email) {
		throw new APIError(undefined, "medical.common.SUPER_ADMIN_EMAIL_CONFLICT");
	}

	const existingEmployee = await prisma.vertical_medical_employee.findFirst({
		where: {
			client_id,
			OR: [
				{ email },
				{ employee_display_id },
				{
					AND: [{ country_code }, { mobile_number }],
				},
			],
		},
	});

	if (existingEmployee) {
		if (existingEmployee.email === email) {
			throw new APIError(undefined, "medical.common.EMAIL_ALREADY_EXISTS");
		}
		if (existingEmployee.employee_display_id === employee_display_id) {
			throw new APIError(undefined, "medical.common.DISPLAY_ID_ALREADY_EXISTS");
		}
		if (
			existingEmployee.country_code === country_code &&
			existingEmployee.mobile_number === mobile_number
		) {
			throw new APIError(undefined, "medical.common.MOBILE_ALREADY_EXISTS");
		}
	}

	try {
		return await prisma.vertical_medical_employee.create({
			data: {
				first_name,
				last_name,
				email,
				country_code,
				mobile_number,
				client_id,
				employee_display_id,
				joining_date,
				role,
				department_id,
			},
		});
	} catch (error: any) {
		if (error?.code === "P2002") {
			const target = error.meta?.target as string[] | undefined;
			if (target?.includes("email")) {
				throw new APIError(undefined, "medical.common.EMAIL_ALREADY_EXISTS");
			}
			if (target?.includes("employee_display_id")) {
				throw new APIError("Employee ID already exists", undefined, undefined, 400);
			}
			if (target?.includes("mobile_number")) {
				throw new APIError("Mobile number already exists for this client", undefined, undefined, 400);
			}
		}
		if (error?.code === "P2003") {
			throw new APIError("Invalid reference: department or client not found", undefined, undefined, 400);
		}
		if (error?.code === "P2000") {
			throw new APIError("One or more field values exceed maximum length", undefined, undefined, 400);
		}
		throw error;
	}
};

interface GetMedicalEmployeesArgs {
	query?: string;
	department_ids?: string[];
	pageSize?: number;
	pageNumber?: number;
	status?: "active" | "unassigned" | "suspended";
	fetchAll?: boolean;
	roles?: ("manager" | "handler")[];
	ids?: string[];
	client_id: string;
	include_boxes?: boolean;
	include_department?: boolean;
	force_include_ids?: string[];
	include_all_managers?: boolean;
	with_connected_boxes?: boolean;
	filter_unassigned?: boolean;
}

export const getMedicalEmployees = async (
	args: GetMedicalEmployeesArgs,
) => {
	const {
		pageNumber,
		pageSize,
		ids,
		department_ids,
		status,
		fetchAll,
		roles,
		query,
		client_id,
		include_boxes,
		include_department,
		force_include_ids,
		include_all_managers,
		with_connected_boxes,
		filter_unassigned,
	} = args;

	const whereClause: any = {
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
					employee_display_id: {
						contains: query,
					},
				},
			]
			: undefined,
		status: status || { not: "suspended" },
		department_id: filter_unassigned
			? null
			: department_ids
				? {
					in: department_ids,
				}
				: undefined,
		role: roles
			? {
				in: roles,
			}
			: undefined,
		client_id,
	};

	let finalWhere: any = whereClause;

	if (include_all_managers) {
		const { client_id: cid, ...filters } = whereClause;
		finalWhere = {
			client_id: cid,
			OR: [
				filters,
				{
					role: "manager",
					status: status || { not: "suspended" },
				},
			],
		};
	}

	if (force_include_ids && force_include_ids.length > 0) {
		const { client_id: cid, ...filters } = finalWhere;
		finalWhere = {
			client_id: cid,
			OR: [
				filters,
				{
					id: { in: force_include_ids },
				},
			],
		};
	}

	if (with_connected_boxes !== undefined) {
		const currentAnd = Array.isArray(finalWhere.AND) ? finalWhere.AND : (finalWhere.AND ? [finalWhere.AND] : []);
		finalWhere.AND = [
			...currentAnd,
			with_connected_boxes
				? { connected_boxes: { some: {} } }
				: { connected_boxes: { none: {} } }
		];
	}

	const queryArgs: any = {
		where: finalWhere,
		skip: !fetchAll && pageNumber && pageSize
			? (pageNumber - 1) * pageSize
			: undefined,
		take: !fetchAll && pageSize ? pageSize : undefined,
		orderBy: { created_at: "desc" },
		include: {
			department: !!include_department || !!include_boxes,
			connected_boxes: include_boxes ? { include: { telemetry: true } } : false,
			employee_boxes: include_boxes
				? {
					include: {
						box: {
							include: {
								telemetry: true
							}
						},
					},
				}
				: false,
			_count: {
				select: {
					connected_boxes: true,
					employee_boxes: true,
				},
			},
		},
	};

	const [employeesResponse, employeesCountResponse] =
		await Promise.allSettled([
			prisma.vertical_medical_employee.findMany(queryArgs),
			prisma.vertical_medical_employee.count({
				where: queryArgs.where,
			}),
		]);

	if (employeesResponse.status === "rejected") {
		throw new APIError(employeesResponse.reason, undefined, undefined, 400);
	}

	if (employeesCountResponse.status === "rejected") {
		throw new APIError(employeesCountResponse.reason, undefined, undefined, 400);
	}

	return {
		employees: employeesResponse.value,
		count: employeesCountResponse.value,
	};
};

interface SearchMedicalEmployeesArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: string;
	department_id?: string | null;
}

export const searchMedicalEmployees = async (
	args: SearchMedicalEmployeesArgs,
) => {
	const { query, client_id, limit = 50, status = "all", department_id } = args;

	return prisma.vertical_medical_employee.findMany({
		where: {
			client_id,
			status: status === "all"
				? undefined
				: status === "active"
					? { in: ["active", "unassigned"] }
					: (status as "suspended" | "unassigned"),
			OR: query
				? [
					{ first_name: { contains: query } },
					{ last_name: { contains: query } },
					{ employee_display_id: { contains: query } },
				]
				: undefined,
			department_id: department_id || undefined,
		},
		select: {
			id: true,
			first_name: true,
			last_name: true,
			employee_display_id: true,
			status: true,
			created_at: true,
			updated_at: true,
		},
		take: limit,
	});
};

interface ToggleSuspendMedicalEmployeeArgs {
	ids: string[];
	state: "active" | "suspended" | "unassigned";
	client_id: string;
}

export const toggleSuspendMedicalEmployees = async (
	args: ToggleSuspendMedicalEmployeeArgs,
) => {
	const currentEmployees = await prisma.vertical_medical_employee.findMany({
		where: { id: { in: args.ids }, client_id: args.client_id },
		select: { id: true, status: true },
	});

	if (currentEmployees.length === 0) {
		throw new APIError("No employees found", undefined, { ids: args.ids }, 404);
	}

	const alreadyInState = currentEmployees.filter((e) => e.status === args.state);
	const toUpdate = currentEmployees.filter((e) => e.status !== args.state);

	if (toUpdate.length > 0) {
		await prisma.vertical_medical_employee.updateMany({
			where: { id: { in: toUpdate.map((e) => e.id) } },
			data: { status: args.state },
		});
	}

	return {
		updated_count: toUpdate.length,
		already_in_state_count: alreadyInState.length,
		not_found_count: args.ids.length - currentEmployees.length,
	};
};

interface ReactivateMedicalEmployeesArgs {
	ids: string[];
	client_id: string;
	reassign_back_to_departments: boolean;
}

export const reactivateMedicalEmployees = async (
	args: ReactivateMedicalEmployeesArgs,
) => {
	const { ids, client_id, reassign_back_to_departments } = args;

	const employees = await prisma.vertical_medical_employee.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No employees found to reactivate", undefined, undefined, 404);
	}

	let idsToActive: string[] = [];
	let idsToInactive: string[] = [];
	let skippedManagersCount = 0;

	if (!reassign_back_to_departments) {
		idsToInactive = employees.map((e) => e.id);
	} else {
		const managerDepartmentCounts: Record<string, number> = {};
		for (const emp of employees) {
			if (emp.role === "manager" && emp.department_id) {
				managerDepartmentCounts[emp.department_id] = (managerDepartmentCounts[emp.department_id] || 0) + 1;
				if ((managerDepartmentCounts[emp.department_id] || 0) > 1) {
					throw new APIError(
						"You cannot reactivate multiple managers for the same department. Only one manager can be reactivated and reassigned to the same department.",
						undefined,
						undefined,
						400
					);
				}
			}
		}

		const departmentIds = employees
			.map((e) => e.department_id)
			.filter((id): id is string => !!id);

		const currentActiveManagers = await prisma.vertical_medical_employee.findMany({
			where: {
				department_id: { in: departmentIds },
				role: "manager",
				status: "active",
				client_id,
			},
			select: { id: true, department_id: true },
		});

		for (const emp of employees) {
			if (emp.role === "manager" && emp.department_id) {
				const activeManagerForDept = currentActiveManagers.find(
					(m) => m.department_id === emp.department_id
				);

				if (activeManagerForDept && activeManagerForDept.id !== emp.id) {
					idsToInactive.push(emp.id);
					skippedManagersCount++;
				} else {
					idsToActive.push(emp.id);
				}
			} else {
				idsToActive.push(emp.id);
			}
		}
	}

	if (idsToActive.length > 0) {
		await prisma.vertical_medical_employee.updateMany({
			where: { id: { in: idsToActive }, client_id },
			data: { status: "active" },
		});
	}

	if (idsToInactive.length > 0) {
		await prisma.vertical_medical_employee.updateMany({
			where: { id: { in: idsToInactive }, client_id },
			data: {
				status: "unassigned",
				department_id: null,
			},
		});
	}

	return {
		updated_count: idsToActive.length + idsToInactive.length,
		already_active_count: employees.filter(e => e.status === "active" && idsToActive.includes(e.id)).length,
		skipped_managers_count: skippedManagersCount,
		total_found: employees.length,
	};
};

interface DeleteMedicalEmployeesArgs {
	ids: string[];
	client_id: string;
}

export const deleteMedicalEmployees = async (args: DeleteMedicalEmployeesArgs) => {
	const { ids, client_id } = args;

	const employees = await prisma.vertical_medical_employee.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
		include: {
			department: true,
			client: true,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No employees found", undefined, { ids }, 404);
	}

	const foundIds = employees.map((e) => e.id);
	const missingIds = ids.filter((id) => !foundIds.includes(id));

	await prisma.vertical_medical_employee_deleted.createMany({
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
			department_name: e.department?.name ?? null,
			profile_pic: e.profile_pic,
			x_primary_key: e.id,
		})),
	});

	await prisma.vertical_medical_employee.deleteMany({
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

interface GetMedicalEmployeeByIdArgs {
	id: string;
	client_id: string;
}

export const getMedicalEmployeeById = async (
	args: GetMedicalEmployeeByIdArgs,
) => {
	const { id, client_id } = args;

	const employee = await prisma.vertical_medical_employee.findFirst({
		where: {
			id,
			client_id,
		},
		omit: { password: true },
		include: {
			department: {
				include: {
					department_boxes: {
						where: { status: "shared" },
						include: {
							box: {
								include: {
									telemetry: true,
								},
							},
						},
					},
				},
			},
			employee_boxes: {
				take: 20,
				orderBy: { created_at: "desc" },
				include: { box: { include: { telemetry: true } } },
			},
		},
	});

	if (!employee) {
		throw new APIError("Employee not found", undefined, undefined, 404);
	}

	return employee;
};

interface UpdateMedicalEmployeeByIdArgs {
	id: string;
	client_id: string;
	first_name?: string;
	last_name?: string;
	country_code?: string;
	mobile_number?: string;
	employee_display_id?: string;
	joining_date?: Date;
	email?: string;
	role?: "manager" | "handler";
	department_id?: string | null;
}

export const updateMedicalEmployeeById = async (
	args: UpdateMedicalEmployeeByIdArgs,
) => {
	args = nullifyEmptyFKs(args);
	const {
		id,
		client_id,
		first_name,
		last_name,
		country_code,
		mobile_number,
		employee_display_id,
		joining_date,
		email,
		role,
		department_id,
	} = args;

	const employee = await prisma.vertical_medical_employee.findUnique({
		where: { id, client_id },
	});

	if (!employee) {
		throw new APIError("Employee not found", undefined, undefined, 404);
	}

	if (department_id) {
		const department = await prisma.vertical_medical_department.findUnique({
			where: {
				id: department_id,
			},
			include: {
				employees: {
					where: {
						role: "manager",
						status: "active",
					},
				},
			},
		});

		if (!department) {
			throw new APIError("No department found to be assigned!", undefined, undefined, 404);
		}

		if (department.client_id !== client_id) {
			throw new APIError(
				"This department does not belong to the same owner! You can only assign employees to your own departments",
				undefined,
				undefined,
				400,
			);
		}

		const finalRole = role ?? employee.role;

		if (finalRole === "manager" && department.employees) {
			const otherManagers = department.employees.filter((emp: any) => emp.id !== employee.id);
			if (otherManagers.length > 0) {
				throw new APIError(
					"This department already has a manager! Please unassign his role first",
					undefined,
					undefined,
					400,
				);
			}
		}
	} else if (role === "manager" && department_id === undefined && employee.department_id) {
		const department = await prisma.vertical_medical_department.findUnique({
			where: { id: employee.department_id },
			include: { employees: { where: { role: "manager", status: "active" } } },
		});
		if (department && department.employees) {
			const otherManagers = department.employees.filter((emp: any) => emp.id !== employee.id);
			if (otherManagers.length > 0) {
				throw new APIError(
					"This department already has a manager! Please unassign his role first",
					undefined,
					undefined,
					400,
				);
			}
		}
	}

	if (email) {
		const existingEmployee = await prisma.vertical_medical_employee.findFirst({
			where: {
				email,
				NOT: {
					id,
				},
			},
		});

		if (existingEmployee) {
			throw new APIError(
				"This email is already registered with another account!",
				undefined,
				undefined,
				400,
			);
		}
	}

	return prisma.vertical_medical_employee.update({
		where: { id, client_id },
		data: {
			first_name,
			last_name,
			country_code,
			mobile_number,
			employee_display_id,
			joining_date,
			email,
			role,
			department_id,
		},
		omit: { password: true },
		include: { department: true },
	});
};

interface ReassignMedicalEmployeeArgs {
	ids: string[];
	client_id: string;
	department_id?: string | null;
}

export const reassignMedicalEmployee = async (
	args: ReassignMedicalEmployeeArgs,
) => {
	const { ids, client_id, department_id } = args;

	const employees = await prisma.vertical_medical_employee.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No employees found", undefined, undefined, 404);
	}

	if (employees.length !== ids.length) {
		throw new APIError(
			`Only ${employees.length} out of ${ids.length} employees were found. Some IDs may be invalid or belong to another client.`,
			undefined,
			undefined,
			400,
		);
	}

	let idsToProcess = ids;
	let skippedManagersCount = 0;

	if (department_id) {
		const targetDepartment = await prisma.vertical_medical_department.findUnique({
			where: { id: department_id, client_id },
		});
		if (!targetDepartment) {
			throw new APIError("Target department not found", undefined, undefined, 404);
		}

		const targetManager = await prisma.vertical_medical_employee.findFirst({
			where: { department_id: department_id, role: "manager" }
		});

		if (targetManager) {
			const incomingManagers = employees.filter((e) => e.role === "manager");
			if (incomingManagers.length > 0) {
				const idsToSkip = incomingManagers.map((m) => m.id);
				idsToProcess = ids.filter((id) => !idsToSkip.includes(id));
				skippedManagersCount = idsToSkip.length;
			}
		}
	}

	if (idsToProcess.length === 0) {
		return { employees: [], skipped_count: skippedManagersCount };
	}

	const employeesToUpdate = employees.filter((e) =>
		idsToProcess.includes(e.id),
	);

	const alreadyAssigned = employeesToUpdate.filter((e) => e.department_id === department_id);
	const newlyAssigned = employeesToUpdate.filter((e) => e.department_id !== department_id);

	if (newlyAssigned.length === 0 && idsToProcess.length > 0) {
		throw new APIError(
			department_id
				? "All selected employees are already assigned to this department."
				: "All selected employees are already unassigned.",
			undefined,
			undefined,
			400,
		);
	}

	if (newlyAssigned.length > 0) {
		await prisma.vertical_medical_employee.updateMany({
			where: { id: { in: newlyAssigned.map((e) => e.id) }, client_id },
			data: { department_id },
		});
	}

	return {
		employees: employeesToUpdate,
		skipped_count: skippedManagersCount,
		newly_assigned_count: newlyAssigned.length,
		already_assigned_count: alreadyAssigned.length,
	};
};

interface GetDeletedMedicalEmployeesArgs {
	query?: string;
	client_id: string;
	pageSize?: number;
	pageNumber?: number;
	fetchAll?: boolean;
}

export const getDeletedMedicalEmployees = async (
	args: GetDeletedMedicalEmployeesArgs,
) => {
	const { client_id, query, pageNumber, pageSize, fetchAll } = args;

	const whereClause: any = {
		client_id: client_id,
		OR: query
			? [
				{ first_name: { contains: query } },
				{ last_name: { contains: query } },
				{ email: { contains: query } },
				{ employee_display_id: { contains: query } },
			]
			: undefined,
	};

	const [employeesResponse, employeesCountResponse] = await Promise.allSettled([
		prisma.vertical_medical_employee_deleted.findMany({
			where: whereClause,
			take: !fetchAll ? pageSize : undefined,
			skip: pageNumber && pageSize && !fetchAll
				? (pageNumber - 1) * pageSize
				: undefined,
			orderBy: { created_at: "desc" },
		}),
		prisma.vertical_medical_employee_deleted.count({
			where: whereClause,
		}),
	]);

	if (employeesResponse.status === "rejected") {
		throw new APIError(String(employeesResponse.reason), undefined, undefined, 400);
	}

	if (employeesCountResponse.status === "rejected") {
		throw new APIError(String(employeesCountResponse.reason), undefined, undefined, 400);
	}

	return {
		employees: employeesResponse.value,
		count: employeesCountResponse.value,
	};
};
