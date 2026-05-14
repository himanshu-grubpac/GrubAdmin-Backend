import type {
	client_employee_role,
	client,
	vertical_food_employee,
	vertical_food_employee_deleted,
	Prisma,
} from "@/db/types";
import { prisma } from "@/db";
import { FOOD_VERTICAL_NAME } from "@/configs/constants.ts";
import { withFullAddress } from "@/utils/restaurant.ts";
import { resolveEmployeeName } from "@/utils/employee.ts";
import { APIError } from "@/types/error";
import type { VerticalFoodEmployeeRoleType } from "@/types/common";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";

interface GetUniqueVerticalFoodEmployeeArgs {
	email?: string;
	phone?: string;
	id?: string;
	employee_display_id?: string;
}

export type GetUniqueVerticalFoodEmployeeResponse =
	| ({
		type: "admin";
	} & {
		employee: client;
	})
	| ({
		type: client_employee_role;
	} & {
		employee: vertical_food_employee;
	})
	| null;


export const getUniqueVerticalFoodEmployee = async (
	args: GetUniqueVerticalFoodEmployeeArgs,
): Promise<GetUniqueVerticalFoodEmployeeResponse> => {
	const { id, email, phone, employee_display_id } = args;

	const foodVertical = await prisma.vertical.findUnique({
		where: {
			name: FOOD_VERTICAL_NAME,
		},
	});

	if (!foodVertical) {
		throw new APIError(undefined, "food.common.VERTICAL_NOT_FOUND");
	}

	const orConditions = [
		email ? { email: email } : {},
		phone ? { mobile_number: phone } : {},
	].filter((condition) => Object.keys(condition).length > 0);

	const superAdmin = await prisma.client.findFirst({
		where: {
			id,
			vertical_id: foodVertical.id,
			OR: orConditions.length > 0 ? orConditions : undefined,
		},
	});

	if (superAdmin) {
		return {
			type: "admin",
			employee: superAdmin,
		};
	}

	const foodEmployee = await prisma.vertical_food_employee.findFirst({
		where: {
			id,
			employee_display_id,
			OR: orConditions.length > 0 ? orConditions : undefined,
		},
	});

	if (foodEmployee) {
		return {
			type: foodEmployee.role,
			employee: foodEmployee,
		};
	}


	return null;
};

interface ActivateVerticalFoodEmployeeArgs {
	email?: string;
	id?: string;
	type: VerticalFoodEmployeeRoleType;
}

export const activateVerticalFoodEmployee = async (
	args: ActivateVerticalFoodEmployeeArgs,
) => {
	const { email, id, type } = args;

	const foodVertical = await prisma.vertical.findUnique({
		where: {
			name: FOOD_VERTICAL_NAME,
		},
	});

	if (!foodVertical) {
		throw new APIError(undefined, "food.common.VERTICAL_NOT_FOUND");
	}

	if (type === "admin") {
		return prisma.client.update({
			where: {
				id,
				vertical_id_email: email
					? {
						email,
						vertical_id: foodVertical.id,
					}
					: undefined,
				status: "inactive",
			},
			data: {
				status: "active",
			},
		});
	} else {
		return prisma.vertical_food_employee.update({
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

type UpdateVerticalFoodEmployeeArgs = {
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
			type: client_employee_role;
			restaurant_id?: string;
		}
	);

export const updateVerticalFoodEmployee = async (
	args: UpdateVerticalFoodEmployeeArgs,
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

	const { restaurant_id } = args as any;

	if (type === "admin") {

		const foodVertical = await prisma.vertical.findUnique({
			where: {
				name: FOOD_VERTICAL_NAME,
			},
		});

		if (!foodVertical) {
			throw new APIError(undefined, "food.common.VERTICAL_NOT_FOUND");
		}

		if (email) {
			const existingClient = await prisma.client.findFirst({
				where: {
					email,
					vertical_id: foodVertical.id,
					NOT: {
						id,
					},
				},
			});

			if (existingClient) {
				throw new APIError(undefined, "food.common.EMAIL_ALREADY_EXISTS");
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
				organization_name:
					type === "admin" ? args.organization : undefined,
				password,
				name:
					first_name || last_name
						? `${first_name ? first_name : ""}${last_name ? ` ${last_name}` : ""}`
						: undefined,
			},
		});
	}

	if (email) {
		const existingEmployee = await prisma.vertical_food_employee.findFirst({
			where: {
				email,
				NOT: {
					id,
				},
			},
		});

		if (existingEmployee) {
			throw new APIError(undefined, "food.common.EMAIL_ALREADY_EXISTS");
		}
	}

	return prisma.vertical_food_employee.update({
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
			restaurant_id: args.restaurant_id,
			password,
		},
	});
};

interface CreateVerticalFoodEmployeeArgs {
	first_name: string;
	last_name: string;
	country_code: string;
	mobile_number: string;
	email: string;
	employee_display_id: string;
	joining_date: Date;
	role: client_employee_role;
	restaurant_id?: string | null;
	client_id: string;
}

export const createVerticalFoodEmployee = async (
	args: CreateVerticalFoodEmployeeArgs,
) => {
	const {
		client_id,
		email,
		employee_display_id,
		restaurant_id,
		first_name,
		last_name,
		country_code,
		mobile_number,
		joining_date,
		role,
	} = args;

	if (restaurant_id) {
		const restaurant = await prisma.restaurant.findUnique({
			where: {
				id: restaurant_id,
			},
			include: {
				employees: {
					where: {
						role: "manager",
					},
				},
			},
		});

		if (!restaurant) {
			throw new APIError("No restaurant found to be assigned!", undefined, undefined, 404);
		}

		if (restaurant.client_id !== client_id) {
			throw new APIError(undefined, "food.common.RESTAURANT_OWNERSHIP_MISMATCH");
		}

		if (role === "manager" && restaurant.employees && restaurant.employees.length > 0) {
			throw new APIError(undefined, "food.common.RESTAURANT_HAS_MANAGER");
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
		throw new APIError(undefined, "food.common.SUPER_ADMIN_EMAIL_CONFLICT");
	}

	const existingEmployee = await prisma.vertical_food_employee.findFirst({
		where: {
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
			throw new APIError(undefined, "food.common.EMAIL_ALREADY_EXISTS");
		}
		if (existingEmployee.employee_display_id === employee_display_id) {
			throw new APIError(undefined, "food.common.DISPLAY_ID_ALREADY_EXISTS");
		}
		if (
			existingEmployee.country_code === country_code &&
			existingEmployee.mobile_number === mobile_number
		) {
			throw new APIError(undefined, "food.common.MOBILE_ALREADY_EXISTS");
		}
	}

	return prisma.vertical_food_employee.create({
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
			restaurant_id,
		},
	});
};

interface GetVerticalFoodEmployeesArgs {
	query?: string;
	restaurant_ids?: string[];
	pageSize?: number;
	pageNumber?: number;
	status?: "active" | "unassigned" | "suspended";
	fetchAll?: boolean;
	roles?: client_employee_role[];
	ids?: string[];
	client_id: string;
	include_boxes?: boolean;
	include_restaurant?: boolean;
	force_include_ids?: string[];
	include_all_managers?: boolean;
	with_connected_boxes?: boolean;
}
interface GetVerticalFoodEmployeeResponse {
	employees: vertical_food_employee[];
	count: number;
}

export const getVerticalFoodEmployees = async (
	args: GetVerticalFoodEmployeesArgs,
): Promise<GetVerticalFoodEmployeeResponse> => {
	const {
		pageNumber,
		pageSize,
		ids,
		restaurant_ids,
		status,
		fetchAll,
		roles,
		query,
		client_id,
		include_boxes,
		include_restaurant,
		force_include_ids,
		include_all_managers,
		with_connected_boxes,
	} = args;

	const whereClause: Prisma.vertical_food_employeeWhereInput = {
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
					restaurant: {
						name: {
							contains: query,
						},
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
		restaurant_id: restaurant_ids
			? {
				in: restaurant_ids,
			}
			: undefined,
		role: roles
			? {
				in: roles,
			}
			: undefined,
		client_id,
	};

	let finalWhere: Prisma.vertical_food_employeeWhereInput = whereClause;

	if (include_all_managers) {
		const { client_id, ...filters } = whereClause;
		finalWhere = {
			client_id,
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
		const { client_id, ...filters } = finalWhere;
		finalWhere = {
			client_id,
			OR: [
				filters,
				{
					id: { in: force_include_ids },
				},
			],
		};
	}

	if (with_connected_boxes) {
        // Ensuring it's applied correctly to finalWhere by appending to AND
        const currentAnd = Array.isArray((finalWhere as any).AND) ? (finalWhere as any).AND : ((finalWhere as any).AND ? [(finalWhere as any).AND] : []);
        (finalWhere as any).AND = [...currentAnd, { connected_boxes: { some: {} } }];
	}

	const queryArgs: Prisma.vertical_food_employeeFindManyArgs = {
		where: finalWhere,
		skip:
			!fetchAll && pageNumber && pageSize
				? (pageNumber - 1) * pageSize
				: undefined,
		take: !fetchAll && pageSize ? pageSize : undefined,
		orderBy: { created_at: "desc" },
		include: {
			restaurant: !!include_restaurant || !!include_boxes
				? {
						include: {
							restaurant_boxes: !!include_boxes
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
						},
					}
				: false,
			connected_boxes: !!include_boxes ? { include: { telemetry: true } } : false,
			vertical_food_employee_boxes: !!include_boxes
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
					vertical_food_employee_boxes: true,
				},
			},
		},
	};

	const [employeesResponse, employeesCountResponse] =
		await Promise.allSettled([
			prisma.vertical_food_employee.findMany(queryArgs),
			prisma.vertical_food_employee.count({
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
		employees: employeesResponse.value.map((employee: any) => {
			const {
				vertical_food_employee_boxes,
				connected_boxes,
				_count,
				...rest
			} = employee;

			const flattenBox = (box: any) => {
				if (!box) return null;
				const { telemetry, ...boxData } = box;
				const { id: _telemetryId, box_id: _telemetryBoxId, updated_at: _telemetryUpdatedAt, ...telemetryData } = (telemetry || {}) as any;
				return { ...boxData, ...telemetryData };
			};

			// Combine direct connections and shared permissions
			const directBoxes = (connected_boxes || []).map(flattenBox);
			const sharedPermissions = (vertical_food_employee_boxes || []).map((p: any) => ({
				...p,
				box: flattenBox(p.box)
			}));
			const managedBoxes: any[] = [];

			// Also include boxes from the primary assigned restaurant
			if ((employee as any).restaurant?.restaurant_boxes) {
				for (const rb of (employee as any).restaurant.restaurant_boxes) {
					if (rb.box) {
						managedBoxes.push(flattenBox(rb.box));
					}
				}
			}

			// Aggregate unique boxes by ID
			const sharedBoxesMap = new Map();
			const connectedBoxesMap = new Map();

			// 1. Physical Connections (connected_boxes)
			for (const b of directBoxes) {
				connectedBoxesMap.set(b.id, b);
			}

			// 2. Shared Permissions / Management (shared_boxes)
			if (rest.role === "manager") {
				// For managers, prioritize all boxes from their managed restaurants (except blocked)
				const blockedBoxIds = new Set(
					sharedPermissions.filter((p: any) => p.status === "blocked").map((p: any) => p.box_id),
				);
				for (const b of managedBoxes) {
					if (!blockedBoxIds.has(b.id)) {
						sharedBoxesMap.set(b.id, b);
					}
				}
			} else {
				// For other roles, include shared permissions
				for (const p of sharedPermissions) {
					if (p.box && p.status !== "blocked") {
						sharedBoxesMap.set(p.box.id, p.box);
					}
				}
			}

			const sharedBoxes = Array.from(sharedBoxesMap.values());
			const connectedBoxes = Array.from(connectedBoxesMap.values());

			const firstConnectedBox = connectedBoxes[0] || null;
			let handler_status = "disconnected";
			if (firstConnectedBox) {
				handler_status = firstConnectedBox.power_status === "off" ? "offline" : (firstConnectedBox.connection_status === "connected" ? "connected" : "disconnected");
			}


			return {
				...rest,
				restaurant: rest.restaurant ? withFullAddress(rest.restaurant) : null,
				handler_status,
				handler_employee: {
					...rest,
					employee_id: rest.employee_display_id,
					password: undefined,
				},
				handler_box: firstConnectedBox,
				connected_boxes_status: connectedBoxes.length > 0,
				connected_boxes_count: connectedBoxes.length,
				connected_boxes: connectedBoxes,
				shared_boxes_count: sharedBoxes.length,
				shared_boxes: sharedBoxes,
			};
		}),
		count: employeesCountResponse.value,
	};
};

// ────────────────────────────────────────────────────
// QUICK SEARCH employees
// ────────────────────────────────────────────────────

interface SearchVerticalFoodEmployeesArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: string;
	restaurant_id?: string | null;
}

export const searchVerticalFoodEmployees = async (
	args: SearchVerticalFoodEmployeesArgs,
) => {
	const { query, client_id, limit = 50, status = "all", restaurant_id } = args;

	return prisma.vertical_food_employee.findMany({
		where: {
			client_id,
			status:
				status === "all"
					? undefined
					: (status as "active" | "suspended" | "unassigned"),
			OR: query
				? [
					{ first_name: { contains: query } },
					{ last_name: { contains: query } },
					{ employee_display_id: { contains: query } },
				]
				: undefined,
			restaurant_id: restaurant_id || undefined,
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

interface ToggleSuspendVerticalFoodEmployeeArgs {
	ids: string[];
	state: "active" | "suspended" | "unassigned";
	client_id: string;
}

export const toggleSuspendVerticalFoodEmployees = async (
	args: ToggleSuspendVerticalFoodEmployeeArgs,
) => {
	const currentEmployees = await prisma.vertical_food_employee.findMany({
		where: { id: { in: args.ids }, client_id: args.client_id },
		select: { id: true, status: true },
	});

	if (currentEmployees.length === 0) {
		throw new APIError("No employees found", undefined, { ids: args.ids }, 404);
	}

	const alreadyInState = currentEmployees.filter((e) => e.status === args.state);
	const toUpdate = currentEmployees.filter((e) => e.status !== args.state);

	if (toUpdate.length > 0) {
		await prisma.vertical_food_employee.updateMany({
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

// ────────────────────────────────────────────────────
// REACTIVATE employees (with manager conflict handling)
// ────────────────────────────────────────────────────

interface ReactivateEmployeesArgs {
	ids: string[];
	client_id: string;
	reassign_back_to_restaurants: boolean;
}

export const reactivateVerticalFoodEmployees = async (
	args: ReactivateEmployeesArgs,
) => {
	const { ids, client_id, reassign_back_to_restaurants } = args;

	const employees = await prisma.vertical_food_employee.findMany({
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

	if (!reassign_back_to_restaurants) {
		idsToInactive = employees.map((e) => e.id);
	} else {
		// We want them active, but check for manager conflicts
		const restaurantIds = employees
			.map((e) => e.restaurant_id)
			.filter((id): id is string => !!id);

		const currentActiveManagers = await prisma.vertical_food_employee.findMany({
			where: {
				restaurant_id: { in: restaurantIds },
				role: "manager",
				status: "active",
				client_id,
			},
			select: { id: true, restaurant_id: true },
		});

		for (const emp of employees) {
			if (emp.role === "manager" && emp.restaurant_id) {
				const activeManagerForRest = currentActiveManagers.find(
					(m) => m.restaurant_id === emp.restaurant_id
				);

				if (activeManagerForRest && activeManagerForRest.id !== emp.id) {
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

	// Update status
	if (idsToActive.length > 0) {
		await prisma.vertical_food_employee.updateMany({
			where: { id: { in: idsToActive }, client_id },
			data: { status: "active" },
		});
	}

	if (idsToInactive.length > 0) {
		// For conflict cases, or if reassign flag is false, set to unassigned
		// If reassign_back_to_restaurants was true but we are here, it means it's a conflict
		// In conflict cases, we also unassign them (restaurant_id = null)
		await prisma.vertical_food_employee.updateMany({
			where: { id: { in: idsToInactive }, client_id },
			data: {
				status: "unassigned",
				restaurant_id: reassign_back_to_restaurants ? null : undefined,
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

interface DeleteVerticalFoodEmployeesArgs {
	ids: string[];
	client_id: string;
}

export const deleteVerticalFoodEmployees = async (args: DeleteVerticalFoodEmployeesArgs) => {
	const { ids, client_id } = args;

	const employees = await prisma.vertical_food_employee.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
		include: {
			restaurant: true,
			client: true,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No employees found", undefined, { ids }, 404);
	}

	const foundIds = employees.map((e) => e.id);
	const missingIds = ids.filter((id) => !foundIds.includes(id));

	// Archive employees
	await prisma.vertical_food_employee_deleted.createMany({
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

	await prisma.vertical_food_employee.deleteMany({
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

// ────────────────────────────────────────────────────
// GET employee by ID (with full details)
// ────────────────────────────────────────────────────

interface GetVerticalFoodEmployeeByIdArgs {
	id: string;
	client_id: string;
}

export const getVerticalFoodEmployeeById = async (
	args: GetVerticalFoodEmployeeByIdArgs,
) => {
	const { id, client_id } = args;

	const employeeExists = await prisma.vertical_food_employee.findUnique({
		where: { id },
		select: { client_id: true },
	});

	if (!employeeExists) {
		throw new APIError("Employee not found", undefined, undefined, 404);
	}

	if (employeeExists.client_id !== client_id) {
		throw new APIError("Access denied: The requested resource is outside your vertical's scope.", undefined, undefined, 403);
	}

	const employee = await prisma.vertical_food_employee.findUnique({
		where: { id },
		omit: { password: true },
		include: {
			restaurant: true,
			vertical_food_employee_boxes: {
				include: { box: true },
			},
		},
	});

	if (!employee) {
		throw new APIError("Employee not found", undefined, undefined, 404);
	}

	return employee;
};

// ────────────────────────────────────────────────────
// UPDATE employee (admin-side: name, role, restaurant, etc.)
// ────────────────────────────────────────────────────

interface UpdateVerticalFoodEmployeeByIdArgs {
	id: string;
	client_id: string;
	first_name?: string;
	last_name?: string;
	country_code?: string;
	mobile_number?: string;
	employee_display_id?: string;
	joining_date?: Date;
	email?: string;
	role?: client_employee_role;
	restaurant_id?: string | null;
}

export const updateVerticalFoodEmployeeById = async (
	args: UpdateVerticalFoodEmployeeByIdArgs,
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
		restaurant_id,
	} = args;

	const employee = await prisma.vertical_food_employee.findUnique({
		where: { id, client_id },
	});

	if (!employee) {
		throw new APIError("Employee not found", undefined, undefined, 404);
	}

	if (restaurant_id) {
		const restaurant = await prisma.restaurant.findUnique({
			where: {
				id: restaurant_id,
			},
			include: {
				employees: {
					where: {
						role: "manager",
					},
				},
			},
		});

		if (!restaurant) {
			throw new APIError("No restaurant found to be assigned!", undefined, undefined, 404);
		}

		if (restaurant.client_id !== client_id) {
			throw new APIError(
				"This restaurant does not belong to the same owner! You can only assign employees to your own restaurants",
				undefined,
				undefined,
				400,
			);
		}

		const finalRole = role ?? employee.role;

		if (finalRole === "manager" && restaurant.employees) {
			const otherManagers = restaurant.employees.filter((emp) => emp.id !== employee.id);
			if (otherManagers.length > 0) {
				throw new APIError(
					"This restaurant already has a manager! Please unassign his role first",
					undefined,
					undefined,
					400,
				);
			}
		}
	} else if (role === "manager" && restaurant_id === undefined && employee.restaurant_id) {
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: employee.restaurant_id },
			include: { employees: { where: { role: "manager" } } },
		});
		if (restaurant && restaurant.employees) {
			const otherManagers = restaurant.employees.filter((emp) => emp.id !== employee.id);
			if (otherManagers.length > 0) {
				throw new APIError(
					"This restaurant already has a manager! Please unassign his role first",
					undefined,
					undefined,
					400,
				);
			}
		}
	}

	if (email) {
		const existingEmployee = await prisma.vertical_food_employee.findFirst({
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

	return prisma.vertical_food_employee.update({
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
			restaurant_id,
		},
		omit: { password: true },
		include: { restaurant: true },
	});
};

// ────────────────────────────────────────────────────
// REASSIGN employee resources (restaurant / boxes)
// ────────────────────────────────────────────────────

interface ReassignEmployeeArgs {
	ids: string[];
	client_id: string;
	restaurant_id?: string | null; // new restaurant to assign (null = unassign)
}

export const reassignVerticalFoodEmployee = async (
	args: ReassignEmployeeArgs,
) => {
	const { ids, client_id, restaurant_id } = args;

	const employees = await prisma.vertical_food_employee.findMany({
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

	// 1. Check for manager conflicts if a target restaurant is provided
	if (restaurant_id) {
		const targetRestaurant = await prisma.restaurant.findUnique({
			where: { id: restaurant_id, client_id },
		});
		if (!targetRestaurant) {
			throw new APIError("Target restaurant not found", undefined, undefined, 404);
		}

		// If target already has a manager, identify incoming managers to skip
		const targetManager = await prisma.vertical_food_employee.findFirst({
			where: { restaurant_id: restaurant_id, role: "manager" }
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
		// Nothing to reassign (all were skipped managers)
		return { employees: [], skipped_count: skippedManagersCount };
	}

	const employeesToUpdate = employees.filter((e) =>
		idsToProcess.includes(e.id),
	);

	// Manager updates natively handled by updating vertical_food_employee below

	// Update restaurant_id for employees
	const alreadyAssigned = employeesToUpdate.filter((e) => e.restaurant_id === restaurant_id);
	const newlyAssigned = employeesToUpdate.filter((e) => e.restaurant_id !== restaurant_id);

	if (newlyAssigned.length === 0 && idsToProcess.length > 0) {
		throw new APIError(
			restaurant_id 
				? "All selected employees are already assigned to this restaurant." 
				: "All selected employees are already unassigned.", 
			undefined,
			undefined,
			400
		);
	}

	if (newlyAssigned.length > 0) {
		await prisma.vertical_food_employee.updateMany({
			where: { id: { in: newlyAssigned.map((e) => e.id) }, client_id },
			data: { restaurant_id },
		});
	}

	return {
		employees: employeesToUpdate,
		skipped_count: skippedManagersCount,
		newly_assigned_count: newlyAssigned.length,
		already_assigned_count: alreadyAssigned.length,
	};
};

// GET deleted employees (from archive table)
// ────────────────────────────────────────────────────

interface GetDeletedVerticalFoodEmployeesArgs {
	query?: string;
	client_id: string;
	pageSize?: number;
	pageNumber?: number;
	fetchAll?: boolean;
}

export const getDeletedVerticalFoodEmployees = async (
	args: GetDeletedVerticalFoodEmployeesArgs,
) => {
	const { client_id, query, pageNumber, pageSize, fetchAll } = args;

	const whereClause: Prisma.vertical_food_employee_deletedWhereInput = {
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
		prisma.vertical_food_employee_deleted.findMany({
			where: whereClause,
			take: !fetchAll ? pageSize : undefined,
			skip:
				pageNumber && pageSize && !fetchAll
					? (pageNumber - 1) * pageSize
					: undefined,
			orderBy: { created_at: "desc" },
		}),
		prisma.vertical_food_employee_deleted.count({
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
