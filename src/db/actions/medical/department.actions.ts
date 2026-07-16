import { APIError } from "@/types/error";
import { prisma } from "@/db";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";
import { DepartmentLifecycleService } from "@/services/resource-lifecycle";

interface CreateDepartmentArgs {
	name: string;
	client_id: string;
	status?: "active" | "suspended";
}

export const createDepartment = async (args: CreateDepartmentArgs) => {
	const { name, client_id, status } = args;

	return prisma.vertical_medical_department.create({
		data: {
			name,
			client_id,
			status,
		},
	});
};

interface GetDepartmentByIdArgs {
	id: string;
	client_id: string;
}

export const getDepartmentById = async (args: GetDepartmentByIdArgs) => {
	const { client_id, id } = args;

	const department = await prisma.vertical_medical_department.findUnique({
		where: { id },
		include: {
			_count: {
				select: {
					department_boxes: {
						where: {
							status: "shared",
							box: { status: { not: "suspended" } },
						},
					},
					employees: true,
				},
			},
			department_boxes: {
				where: {
					box: {
						status: "suspended",
					},
				},
				select: {
					id: true,
				},
			},
			employees: {
				select: {
					id: true,
					role: true,
					first_name: true,
					last_name: true,
					created_at: true,
					updated_at: true,
					status: true,
				},
			},
		},
	});

	if (!department) {
		throw new APIError(undefined, "medical.department.assign.manager.NOT_FOUND", undefined, 404);
	}

	if (department.client_id !== client_id) {
		throw new APIError(undefined, "medical.common.ACCESS_DENIED", undefined, 403);
	}

	const manager = department.employees.find((e: any) => e.role === "manager") || null;

	return {
		...department,
		manager: manager || null,
		_count: {
			boxes: department._count.department_boxes,
			total_employees: department._count.employees,
			managers: department.employees.filter((e: any) => e.role === "manager").length,
			delivery: department.employees.filter((e: any) => e.role === "delivery").length,
			suspended_boxes: department.department_boxes.length,
		},
	};
};

interface GetDepartmentArgs {
	query?: string;
	status?: "active" | "suspended";
	manager?: boolean;
	delivery?: boolean;
	box?: boolean;
	page_size?: number;
	page_number?: number;
	client_id: string;
	fetch_all?: boolean;
}

export const getDepartments = async (args: GetDepartmentArgs) => {
	const {
		query,
		status,
		manager,
		delivery: deliveryFilter,
		box,
		page_size,
		page_number,
		client_id,
		fetch_all,
	} = args;

	const departmentsQuery: any = {
		where: {
			OR: query
				? [
						{
							name: {
								contains: query,
							},
						},
						{
							employees: {
								some: {
									role: "manager",
									OR: [
										{ first_name: { contains: query } },
										{ last_name: { contains: query } },
									],
								},
							},
						},
					]
				: undefined,
			status: status || { not: "suspended" },
			client_id,
			employees:
				manager === true || manager === false
					? {
							some: manager ? { role: "manager", status: { not: "suspended" } } : undefined,
							none: manager ? undefined : { role: "manager", status: { not: "suspended" } },
						}
					: deliveryFilter === true || deliveryFilter === false
						? {
								some: deliveryFilter
									? { role: "delivery", status: { not: "suspended" } }
									: undefined,
								none: deliveryFilter
									? undefined
									: { role: "delivery", status: { not: "suspended" } },
							}
						: undefined,
			department_boxes:
				box === true || box === false
					? {
							some: box
								? {
										status: "shared",
										box: { status: { not: "suspended" } },
									}
								: undefined,
							none: box
								? undefined
								: {
										status: "shared",
										box: { status: { not: "suspended" } },
									},
						}
					: undefined,
		},
		skip: !fetch_all && page_number && page_size
			? (page_number - 1) * page_size
			: undefined,
		take: !fetch_all && page_size ? page_size : undefined,
		include: {
			_count: {
				select: {
					department_boxes: {
						where: {
							status: "shared",
							box: { status: { not: "suspended" } },
						},
					},
					employees: true,
				},
			},
			employees: {
				where: {
					role: { in: ["manager", "handler"] },
				},
				select: {
					role: true,
					created_at: true,
					updated_at: true,
				},
			},
			department_boxes: {
				where: {
					box: {
						status: "suspended",
					},
				},
				select: {
					id: true,
				},
			},
		},
	};

	const [departmentsResponse, departmentsCountResponse] =
		await Promise.allSettled([
			prisma.vertical_medical_department.findMany(departmentsQuery),
			prisma.vertical_medical_department.count({
				where: departmentsQuery.where,
			}),
		]);

	if (departmentsResponse.status === "rejected") {
		throw new APIError(String(departmentsResponse.reason), undefined, undefined, 400);
	}

	if (departmentsCountResponse.status === "rejected") {
		throw new APIError(String(departmentsCountResponse.reason), undefined, undefined, 400);
	}

	const rawDepartments = departmentsResponse.value;
	const departmentIds = rawDepartments.map((r: any) => r.id);

	const managers = await prisma.vertical_medical_employee.findMany({
		where: {
			department_id: { in: departmentIds },
			role: "manager",
			status: { not: "suspended" },
		},
	});

	const departments = rawDepartments.map((r: any) => {
		const { department_boxes, employees, ...rest } = r;
		return {
			...rest,
			manager: managers.find((m: any) => m.department_id === r.id) || null,
			_count: {
				boxes: r._count.department_boxes,
				total_employees: r._count.employees,
				managers: employees.filter((e: any) => e.role === "manager").length,
				delivery: employees.filter((e: any) => e.role === "delivery").length,
				suspended_boxes: department_boxes.length,
			},
		};
	});

	return {
		departments,
		count: departmentsCountResponse.value,
	};
};

interface GetDepartmentDropdownsArgs {
	client_id: string;
}

export const getDepartmentDropdowns = async (
	args: GetDepartmentDropdownsArgs,
) => {
	const { client_id } = args;

	const departments = await prisma.vertical_medical_department.findMany({
		where: {
			client_id,
		},
		select: {
			id: true,
			name: true,
			created_at: true,
			updated_at: true,
			_count: {
				select: {
					department_boxes: {
						where: {
							status: "shared",
							box: { status: { not: "suspended" } },
						},
					},
					employees: true,
				},
			},
			employees: {
				where: {
					role: { in: ["manager", "handler"] },
				},
				select: {
					role: true,
					created_at: true,
					updated_at: true,
				},
			},
			department_boxes: {
				where: {
					box: {
						status: "suspended",
					},
				},
				select: {
					id: true,
				},
			},
		},
	});

	return departments.map((r: any) => {
		const { department_boxes, employees, ...rest } = r;
		return {
			...rest,
			_count: {
				boxes: r._count.department_boxes,
				total_employees: r._count.employees,
				managers: employees.filter((e: any) => e.role === "manager").length,
				delivery: employees.filter((e: any) => e.role === "delivery").length,
				suspended_boxes: department_boxes.length,
			},
		};
	});
};

interface UpdateDepartmentArgs {
	id: string;
	client_id: string;
	name?: string;
	status?: "active" | "suspended";
}

export const updateDepartment = async (args: UpdateDepartmentArgs) => {
	args = nullifyEmptyFKs(args);
	const { id, client_id, name, status } = args;

	return prisma.vertical_medical_department.update({
		where: {
			id,
			client_id,
		},
		data: {
			name,
			status,
		},
	});
};

interface SuspendDepartmentResourcesArgs {
	client_id: string;
	ids: string[];
	resource_status?: "suspend" | "assign";
	destination_department_id?: string | null;
}

export const suspendDepartmentResources = async (
	args: SuspendDepartmentResourcesArgs,
) => {
	const { client_id, ids, resource_status = "suspend", destination_department_id } = args;

	const lifecycleService = new DepartmentLifecycleService();

	const finalDestinationId =
		destination_department_id === "" || destination_department_id === null || destination_department_id === undefined
			? null
			: destination_department_id;

	await lifecycleService.suspendWithResources({
		client_id,
		department_ids: ids,
		action: resource_status,
		destination_department_id: finalDestinationId,
	});
};

interface DeleteDepartmentsArgs {
	client_id: string;
	ids: string[];
	destination_department_id?: string | null;
}

export const deleteDepartments = async (args: DeleteDepartmentsArgs) => {
	const { client_id, ids, destination_department_id } = args;

	const lifecycleService = new DepartmentLifecycleService();

	return lifecycleService.deleteWithResources(
		ids,
		client_id,
		destination_department_id ?? null,
	);
};

interface ReactivateDepartmentsArgs {
	client_id: string;
	ids: string[];
	reactivate_employees?: boolean;
	reactivate_boxes?: boolean;
}

export const reactivateDepartments = async (
	args: ReactivateDepartmentsArgs,
) => {
	const { client_id, ids, reactivate_employees, reactivate_boxes } = args;

	const lifecycleService = new DepartmentLifecycleService();

	const result = await lifecycleService.reactivateWithResources(
		ids,
		client_id,
		reactivate_employees ?? false,
		reactivate_boxes ?? false,
	);

	return { count: result.department_results.updated_count };
};

interface AssignDepartmentManagerArgs {
	id: string;
	client_id: string;
	manager_id: string | null;
}

export const assignDepartmentManager = async (
	args: AssignDepartmentManagerArgs,
) => {
	const { id, client_id, manager_id } = args;

	const department = await prisma.vertical_medical_department.findUnique({
		where: { id, client_id, status: { not: "suspended" } },
	});

	if (!department) {
		throw new APIError(undefined, "medical.department.assign.manager.NOT_FOUND", undefined, 404);
	}

	if (manager_id) {
		const manager = await prisma.vertical_medical_employee.findUnique({
			where: { id: manager_id, client_id },
		});

		if (!manager) {
			throw new APIError("Employee not found or does not belong to this client", undefined, undefined, 404);
		}

		if (manager.role !== "manager") {
			throw new APIError(
				"Only employees with role 'manager' can be assigned as a department manager",
				"medical.department.assign.manager.INVALID_ROLE",
				{ id: manager_id },
				400
			);
		}

		if (manager.department_id && manager.department_id !== id) {
			throw new APIError(
				`This manager is already assigned to another department. Please unassign them first.`,
				"medical.department.assign.manager.REASSIGNMENT_CONFLICT",
				{ id: manager.department_id },
				409
			);
		}

		const currentManager = await prisma.vertical_medical_employee.findFirst({
			where: { department_id: id, role: "manager", status: "active" }
		});

		if (currentManager && currentManager.id !== manager_id) {
			throw new APIError(
				"This department already has an active manager! Please unassign them first.",
				"medical.department.assign.manager.ALREADY_HAS_MANAGER",
				{ manager_id: currentManager.id },
				400
			);
		}

		await prisma.vertical_medical_employee.update({
			where: { id: manager_id, client_id },
			data: { department_id: id },
		});
	} else {
		await prisma.vertical_medical_employee.updateMany({
			where: { department_id: id, client_id, role: "manager" },
			data: { department_id: null },
		});
	}

	return department;
};

interface GetDepartmentEmployeesArgs {
	id: string;
	client_id: string;
	status?: "active" | "suspended" | "unassigned";
}

export const getDepartmentEmployees = async (
	args: GetDepartmentEmployeesArgs,
) => {
	const { id, client_id, status } = args;

	const department = await prisma.vertical_medical_department.findUnique({
		where: { id, client_id, status: { not: "suspended" } },
	});

	if (!department) {
		throw new APIError(undefined, "medical.department.assign.manager.NOT_FOUND", undefined, 404);
	}

	const employees = await prisma.vertical_medical_employee.findMany({
		where: {
			department_id: id,
			client_id,
			status: status || { not: "suspended" },
		},
	});

	return { department, employees };
};

interface RemoveDepartmentEmployeesArgs {
	id: string;
	client_id: string;
	employee_ids: string[];
}

export const removeDepartmentEmployees = async (
	args: RemoveDepartmentEmployeesArgs,
) => {
	const { id, client_id, employee_ids } = args;

	const department = await prisma.vertical_medical_department.findUnique({
		where: { id, client_id, status: { not: "suspended" } },
	});

	if (!department) throw new APIError(undefined, "medical.department.assign.manager.NOT_FOUND", undefined, 404);

	const employees = await prisma.vertical_medical_employee.findMany({
		where: {
			id: { in: employee_ids },
			department_id: id,
			client_id,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No matching employees found in this department", undefined, {
			employee_ids,
		}, 404);
	}

	await prisma.vertical_medical_employee.updateMany({
		where: { id: { in: employee_ids }, department_id: id, client_id },
		data: { department_id: null },
	});

	return { removed_count: employees.length };
};

interface ReassignDepartmentArgs {
	from_department_ids: string[];
	to_department_id: string;
	client_id: string;
	reassign_employees?: boolean;
	reassign_boxes?: boolean;
}

export const reassignDepartmentResources = async (
	args: ReassignDepartmentArgs,
) => {
	const {
		from_department_ids,
		to_department_id,
		client_id,
		reassign_employees,
		reassign_boxes,
	} = args;

	if (from_department_ids.includes(to_department_id)) {
		throw new APIError("Self-reassignment target is not allowed", undefined, undefined, 400);
	}

	const [fromDepartments, toDepartment] = await Promise.all([
		prisma.vertical_medical_department.findMany({
			where: { id: { in: from_department_ids }, client_id, status: { not: "suspended" } },
		}),
		prisma.vertical_medical_department.findUnique({
			where: { id: to_department_id, client_id, status: "active" },
		}),
	]);

	if (fromDepartments.length !== from_department_ids.length) {
		throw new APIError("Source departments not found", undefined, undefined, 404);
	}
	if (!toDepartment) throw new APIError(undefined, "medical.department.assign.manager.NOT_FOUND", undefined, 404);

	await prisma.$transaction(async (tx) => {
		if (reassign_employees) {
			const employeesToMove = await tx.vertical_medical_employee.findMany({
				where: { department_id: { in: from_department_ids }, client_id }
			});

			const managersToMove = employeesToMove.filter((e: any) => e.role === "manager");

			if (managersToMove.length > 0) {
				const existingManager = await tx.vertical_medical_employee.findFirst({
					where: { department_id: to_department_id, role: "manager" }
				});

				if (existingManager || managersToMove.length > 1) {
					let managerToKeepId = existingManager ? existingManager.id : managersToMove[0]!.id;
					const managersToUnassign = managersToMove.filter((m: any) => m.id !== managerToKeepId);

					if (managersToUnassign.length > 0) {
						await tx.vertical_medical_employee.updateMany({
							where: { id: { in: managersToUnassign.map((m: any) => m.id) } },
							data: { department_id: null }
						});
					}
				}
			}

			const nonManagerEmployees = employeesToMove.filter((e: any) => e.role !== "manager");
			const movingManagers = managersToMove.filter((e: any) => e.role === "manager");

			const existingManager = await tx.vertical_medical_employee.findFirst({
				where: { department_id: to_department_id, role: "manager" }
			});

			const allowedManagerToAssign = existingManager ? null : movingManagers[0];

			const allMovingIds = [
				...nonManagerEmployees.map((e: any) => e.id),
				...(allowedManagerToAssign ? [allowedManagerToAssign.id] : [])
			];

			if (allMovingIds.length > 0) {
				await tx.vertical_medical_employee.updateMany({
					where: { id: { in: allMovingIds }, client_id },
					data: { department_id: to_department_id },
				});
			}
		}

		if (reassign_boxes) {
			const dbs = await tx.vertical_medical_department_box.findMany({
				where: {
					department_id: { in: fromDepartments.map((department) => department.id) },
				},
			});
			const boxIds = dbs.map((db: any) => db.box_id);
			const ownedBoxes = await tx.box.findMany({
				where: { id: { in: boxIds }, client_id },
				select: { id: true },
			});
			const ownedBoxIds = ownedBoxes.map((box) => box.id);

			await tx.vertical_medical_department_box.deleteMany({
				where: { box_id: { in: ownedBoxIds } },
			});

			if (ownedBoxIds.length > 0) {
				await tx.vertical_medical_department_box.createMany({
					data: ownedBoxIds.map((box_id: string) => ({
						box_id,
						department_id: to_department_id,
						status: "shared",
					})),
				});
			}
		}
	});

	return { from_department_ids, to_department_id };
};

interface AssignEmployeesToDepartmentArgs {
	department_id: string;
	employee_ids: string[];
	role: "manager" | "handler";
	client_id: string;
}

export const assignEmployeesToDepartment = async (
	args: AssignEmployeesToDepartmentArgs,
) => {
	const { department_id, employee_ids, role, client_id } = args;

	const department = await prisma.vertical_medical_department.findUnique({
		where: { id: department_id, client_id, status: "active" },
	});

	if (!department) {
		throw new APIError(undefined, "medical.department.assign.manager.NOT_FOUND", undefined, 404);
	}

	if (role === "manager") {
		const existingManager = await prisma.vertical_medical_employee.findFirst({
			where: { department_id, role: "manager", status: "active" }
		});

		if (existingManager) {
			throw new APIError(
				"This department already has an active manager! Please unassign them first.",
				"medical.department.assign.manager.ALREADY_HAS_MANAGER",
				{ manager_id: existingManager.id },
				409
			);
		}

		if (employee_ids.length > 1) {
			throw new APIError(
				"Cannot assign multiple managers to a single department simultaneously.",
				"medical.department.assign.manager.MULTIPLE_MANAGERS_NOT_ALLOWED",
				undefined,
				400
			);
		}
	}

	const updateResult = await prisma.vertical_medical_employee.updateMany({
		where: {
			id: { in: employee_ids },
			client_id,
		},
		data: {
			department_id,
			role,
		},
	});

	return updateResult;
};

interface SearchDepartmentsArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: string;
}

export const searchDepartments = async (
	args: SearchDepartmentsArgs,
) => {
	const { query, client_id, limit = 50, status = "all" } = args;

	return prisma.vertical_medical_department.findMany({
		where: {
			client_id,
			status: status === "all"
				? { not: "suspended" }
				: (status as "active" | "suspended"),
			OR: query
				? [
					{ name: { contains: query } },
				]
				: undefined,
		},
		select: {
			id: true,
			name: true,
			status: true,
			created_at: true,
			updated_at: true,
			_count: {
				select: {
					department_boxes: true,
				},
			},
		},
		take: limit,
	});
};
