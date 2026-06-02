import { APIError } from "@/types/error";
import { prisma } from "..";
import { type Prisma, type client_employee_role } from "../types";
import { BoxConfig } from "@/db/mongo-schema";
import { nullifyEmptyFKs } from "@/utils/clean-query.ts";

interface CreateRestaurantArgs {
	name: string;
	client_id: string;
	state: string;
	city: string;
	pincode: string;
	line_one: string;
	line_two?: string;
	latitude?: number | null;
	longitude?: number | null;
	google_place_id?: string | null;
	status?: "active" | "suspended";
}

export const createRestaurant = async (args: CreateRestaurantArgs) => {
	const {
		name,
		client_id,
		state,
		city,
		pincode,
		line_one,
		line_two,
		latitude,
		longitude,
		google_place_id,
		status,
	} = args;

	return prisma.restaurant.create({
		data: {
			name,
			client_id,
			state,
			city,
			pincode,
			line_one,
			line_two,
			latitude,
			longitude,
			google_place_id,
			status,
		},
	});
};

interface GetRestaurantByIdArgs {
	id: string;
	client_id: string;
}

export const getRestaurantById = async (args: GetRestaurantByIdArgs) => {
	const { client_id, id } = args;

	const restaurant = await prisma.restaurant.findUnique({
		where: { id },
		include: {
			_count: {
				select: {
					restaurant_boxes: {
						where: {
							status: "shared",
							box: { status: { not: "suspended" } },
						},
					},
					employees: {
						where: {
							status: { not: "suspended" },
						},
					},
				},
			},
			restaurant_boxes: {
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
				where: {
					status: { not: "suspended" },
				},
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

	if (!restaurant) {
		throw new APIError(undefined, "food.restaurant.assign.manager.RESTAURANT_NOT_FOUND", undefined, 404);
	}

	if (restaurant.client_id !== client_id) {
		throw new APIError(undefined, "food.restaurant.assign.manager.ACCESS_DENIED", undefined, 403);
	}

	const manager = restaurant.employees.find((e: any) => e.role === "manager") || null;

	return {
		...restaurant,
		manager: manager || null,
		_count: {
			boxes: restaurant._count.restaurant_boxes,
			total_employees: restaurant._count.employees,
			managers: restaurant.employees.filter((e: any) => e.role === "manager").length,
			drivers: restaurant.employees.filter((e: any) => e.role === "delivery").length,
			suspended_boxes: restaurant.restaurant_boxes.length,
		},
	};
};

interface GetRestaurantArgs {
	query?: string;
	status?: "active" | "suspended";
	manager?: boolean;
	driver?: boolean;
	box?: boolean;
	page_size?: number;
	page_number?: number;
	client_id: string;
	fetch_all?: boolean;
	exclude_restaurant_ids?: string[];
}

export const getRestaurants = async (args: GetRestaurantArgs) => {
	const {
		query,
		status,
		manager,
		driver,
		box,
		page_size,
		page_number,
		client_id,
		fetch_all,
		exclude_restaurant_ids,
	} = args;

	const restaurantsQuery: Prisma.restaurantFindManyArgs = {
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
						{
							state: {
								contains: query,
							},
						},
						{
							city: {
								contains: query,
							},
						},
						{
							pincode: {
								contains: query,
							},
						},
						{
							line_one: {
								contains: query,
							},
						},
						{
							line_two: {
								contains: query,
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
					: driver === true || driver === false
						? {
								some: driver
									? {
											role: "delivery",
											status: { not: "suspended" },
										}
									: undefined,
								none: driver
									? undefined
									: {
											role: "delivery",
											status: { not: "suspended" },
										},
							}
						: undefined,
			restaurant_boxes:
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
			id: exclude_restaurant_ids
				? {
						notIn: exclude_restaurant_ids,
					}
				: undefined,
		},
		skip:
			!fetch_all && page_number && page_size
				? (page_number - 1) * page_size
				: undefined,
		take: !fetch_all && page_size ? page_size : undefined,
		include: {
			_count: {
				select: {
					restaurant_boxes: {
						where: {
							status: "shared",
							box: { status: { not: "suspended" } },
						},
					},
					employees: {
						where: {
							status: { not: "suspended" },
						},
					},
				},
			},
			employees: {
				where: {
					role: { in: ["manager", "delivery"] },
					status: { not: "suspended" },
				},
				select: {
					role: true,
					created_at: true,
					updated_at: true,
				},
			},
			restaurant_boxes: {
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

	const [restaurantsResponse, restaurantsCountResponse] =
		await Promise.allSettled([
			prisma.restaurant.findMany(restaurantsQuery),
			prisma.restaurant.count({
				where: restaurantsQuery.where,
			}),
		]);

	if (restaurantsResponse.status === "rejected") {
		throw new APIError(String(restaurantsResponse.reason), undefined, undefined, 400);
	}

	if (restaurantsCountResponse.status === "rejected") {
		throw new APIError(String(restaurantsCountResponse.reason), undefined, undefined, 400);
	}

	const rawRestaurants = restaurantsResponse.value;
	const restaurantIds = rawRestaurants.map((r) => r.id);

	// Fetch managers manually
	const managers = await prisma.vertical_food_employee.findMany({
		where: {
			restaurant_id: { in: restaurantIds },
			role: "manager",
			status: { not: "suspended" },
		},
	});

	const restaurants = rawRestaurants.map((r: any) => {
		const { restaurant_boxes, employees, ...rest } = r;
		return {
			...rest,
			manager: managers.find((m) => m.restaurant_id === r.id) || null,
			_count: {
				boxes: r._count.restaurant_boxes,
				total_employees: r._count.employees,
				managers: employees.filter((e: any) => e.role === "manager").length,
				drivers: employees.filter((e: any) => e.role === "delivery").length,
				suspended_boxes: restaurant_boxes.length,
			},
		};
	});

	return {
		restaurants,
		count: restaurantsCountResponse.value,
	};
};

interface GetRestaurantDropdownsArgs {
	client_id: string;
}

export const getRestaurantDropdowns = async (
	args: GetRestaurantDropdownsArgs,
) => {
	const { client_id } = args;

	const restaurants = await prisma.restaurant.findMany({
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
					restaurant_boxes: {
						where: {
							status: "shared",
							box: { status: { not: "suspended" } },
						},
					},
					employees: {
						where: {
							status: { not: "suspended" },
						},
					},
				},
			},
			employees: {
				where: {
					role: { in: ["manager", "delivery"] },
					status: { not: "suspended" },
				},
				select: {
					role: true,
					created_at: true,
					updated_at: true,
				},
			},
			restaurant_boxes: {
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

	return restaurants.map((r: any) => {
		const { restaurant_boxes, employees, ...rest } = r;
		return {
			...rest,
			_count: {
				boxes: r._count.restaurant_boxes,
				total_employees: r._count.employees,
				managers: employees.filter((e: any) => e.role === "manager").length,
				drivers: employees.filter((e: any) => e.role === "delivery").length,
				suspended_boxes: restaurant_boxes.length,
			},
		};
	});
};

interface UpdateRestaurantArgs {
	id: string;
	client_id: string;
	name?: string;
	state?: string;
	city?: string;
	pincode?: string;
	line_one?: string;
	line_two?: string;
	latitude?: number | null;
	longitude?: number | null;
	google_place_id?: string | null;
	status?: "active" | "suspended";
}

export const updateRestaurant = async (args: UpdateRestaurantArgs) => {
	args = nullifyEmptyFKs(args);
	const {
		id,
		client_id,
		name,
		state,
		city,
		pincode,
		line_one,
		line_two,
		latitude,
		longitude,
		google_place_id,
		status,
	} = args;

	return prisma.restaurant.update({
		where: {
			id,
			client_id,
		},
		data: {
			name,
			state,
			city,
			pincode,
			line_one,
			line_two,
			latitude,
			longitude,
			google_place_id,
			status,
		},
	});
};

interface UnassignRestaurantResourcesArgs {
	client_id: string;
	ids: string[];
}

export const unassignRestaurantResources = async (
	args: UnassignRestaurantResourcesArgs,
) => {
	const { client_id, ids } = args;

	const restaurants = await prisma.restaurant.findMany({
		where: {
			id: {
				in: ids,
			},
			client_id,
		},
		include: {
			restaurant_boxes: true,
		},
	});

	const boxIds = restaurants
		.map((restaurant) => restaurant.restaurant_boxes.map((rb) => rb.box_id))
		.flat();

	await prisma.$transaction(async (tx) => {
		await tx.restaurant_box.deleteMany({
			where: {
				restaurant_id: {
					in: ids,
				},
			},
		});

		await tx.vertical_food_employee.updateMany({
			where: {
				restaurant_id: {
					in: restaurants.map((restaurant) => restaurant.id),
				},
				client_id,
			},
			data: {
				restaurant_id: null,
			},
		});

		if (boxIds.length > 0) {
			await BoxConfig.updateMany(
				{
					box_id: {
						$in: boxIds,
					},
				},
				{
					$set: {
						driver_id: null,
						restaurant_id: null,
					},
				},
			);

			await tx.vertical_food_employee_box.deleteMany({
				where: {
					box_id: {
						in: boxIds,
					},
				},
			});
		}
	});
};

interface SuspendRestaurantResourcesArgs {
	client_id: string;
	ids: string[];
	resource_status?: "suspend" | "assign";
	destination_restaurant_id?: string | null;
}

export const suspendRestaurantResources = async (
	args: SuspendRestaurantResourcesArgs,
) => {
	const { client_id, ids, resource_status = "suspend", destination_restaurant_id } = args;

	const restaurants = await prisma.restaurant.findMany({
		where: {
			id: {
				in: ids,
			},
			client_id,
		},
		include: {
			restaurant_boxes: true,
		},
	});

	if (restaurants.length === 0) {
		throw new APIError(
			undefined,
			"food.restaurant.resource.NOT_FOUND",
			{ ids },
			404
		);
	}

	if (restaurants.length !== ids.length) {
		throw new APIError(
			undefined,
			"food.restaurant.resource.PARTIAL_FOUND",
			{
				requested_ids: ids,
				found_count: restaurants.length,
			},
			409
		);
	}

	if (destination_restaurant_id) {
		const destRestaurant = await prisma.restaurant.findUnique({
			where: { id: destination_restaurant_id, client_id, status: "active" },
		});

		if (!destRestaurant) {
			throw new APIError(
				undefined,
				"food.restaurant.resource.NOT_FOUND",
				{ id: destination_restaurant_id },
				404
			);
		}

		if (ids.includes(destination_restaurant_id)) {
			throw new APIError(
				"Self-reassignment target is not allowed",
				undefined,
				undefined,
				400
			);
		}
	}

	const toSuspend = restaurants.filter((r) => r.status !== "suspended");

	if (toSuspend.length === 0) {
		throw new APIError(
			undefined,
			"food.common.ALREADY_IN_STATE",
			{ ids, state: "suspended" },
			409
		);
	}

	const boxIds = restaurants
		.map((restaurant) => restaurant.restaurant_boxes.map((rb) => rb.box_id))
		.flat();

	await prisma.$transaction(async (tx) => {
		// ALWAYS suspend the target restaurants
		await tx.restaurant.updateMany({
			where: {
				id: { in: toSuspend.map(r => r.id) },
				client_id,
			},
			data: {
				status: "suspended",
			},
		});

		if (resource_status === "suspend") {
			if (boxIds.length > 0) {
				await tx.box.updateMany({
					where: {
						id: { in: boxIds },
						client_id: client_id,
					},
					data: {
						status: "suspended",
					},
				});
			}

			await tx.vertical_food_employee.updateMany({
				where: {
					restaurant_id: { in: ids },
					client_id,
				},
				data: {
					status: "suspended",
				},
			});
		} else if (resource_status === "assign") {
			// If destination_restaurant_id is provided, reassign boxes. Otherwise unassign.
			if (boxIds.length > 0) {
				await tx.restaurant_box.deleteMany({
					where: { box_id: { in: boxIds } }
				});
				if (destination_restaurant_id) {
					await tx.restaurant_box.createMany({
						data: boxIds.map(box_id => ({ box_id, restaurant_id: destination_restaurant_id, status: "shared" }))
					});
				}
			}

			// Reassign or unassign employees
			const employeesToMove = await tx.vertical_food_employee.findMany({
				where: {
					restaurant_id: { in: ids },
					client_id,
				}
			});

			const managersToMove = employeesToMove.filter(e => e.role === "manager");

			if (destination_restaurant_id && managersToMove.length > 0) {
				const destManager = await tx.vertical_food_employee.findFirst({
					where: { restaurant_id: destination_restaurant_id, role: "manager" }
				});

				if (destManager) {
					throw new APIError(
						"This destination restaurant already has an active manager! Cannot assign another.",
						"food.restaurant.assign.manager.SUSPENSION_CONFLICT",
						{ 
							suspended_restaurant_ids: ids,
							destination_id: destination_restaurant_id
						},
						409
					);
				}
			}

			await tx.vertical_food_employee.updateMany({
				where: {
					restaurant_id: { in: ids },
					client_id,
				},
				data: {
					restaurant_id: destination_restaurant_id || null,
				},
			});
		}
	});
};

// ────────────────────────────────────────────
// DELETE restaurants
// ────────────────────────────────────────────

interface DeleteRestaurantsArgs {
	client_id: string;
	ids: string[];
	destination_restaurant_id?: string | null;
}

export const deleteRestaurants = async (args: DeleteRestaurantsArgs) => {
	const { client_id, ids, destination_restaurant_id } = args;

	const restaurants = await prisma.restaurant.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
		include: { 
			restaurant_boxes: true,
			client: true,
		},
	});

	if (restaurants.length === 0) {
		throw new APIError(undefined, "food.restaurant.resource.NOT_FOUND", { ids }, 404);
	}

	if (restaurants.length !== ids.length) {
		throw new APIError(
			undefined,
			"food.restaurant.resource.PARTIAL_FOUND",
			{
				requested_ids: ids,
				found_count: restaurants.length,
			},
			409
		);
	}

	// Fetch managers for archiving
	const managers = await prisma.vertical_food_employee.findMany({
		where: {
			restaurant_id: { in: ids },
			role: "manager",
			status: { not: "suspended" },
		},
	});

	if (destination_restaurant_id) {
		const destRestaurant = await prisma.restaurant.findUnique({
			where: { id: destination_restaurant_id, client_id },
		});

		if (!destRestaurant) {
			throw new APIError(
				undefined,
				"food.restaurant.resource.NOT_FOUND",
				{ id: destination_restaurant_id },
				404
			);
		}

		if (destRestaurant.status !== "active") {
			throw new APIError(
				undefined,
				"food.restaurant.resource.REASSIGNMENT_TO_NON_ACTIVE",
				undefined,
				409
			);
		}

		if (ids.includes(destination_restaurant_id)) {
			throw new APIError(
				"Self-reassignment target is not allowed",
				undefined,
				undefined,
				400
			);
		}
	}

	const boxIds = restaurants.flatMap((r) => r.restaurant_boxes.map((rb) => rb.box_id));

	// Pre-deletion checks for active resources
	const employeeCount = await prisma.vertical_food_employee.count({
		where: { restaurant_id: { in: ids }, client_id },
	});

	if ((boxIds.length > 0 || employeeCount > 0) && !destination_restaurant_id) {
		throw new APIError(
			"Cannot delete restaurant(s) with active resources (employees/boxes) assigned unless a destination restaurant is provided for reassignment.",
			"food.restaurant.delete.ACTIVE_DEPENDENCIES",
			{ box_count: boxIds.length, employee_count: employeeCount },
			409
		);
	}

	// Execute atomic operations in transaction
	await prisma.$transaction(async (tx) => {
		// Archive restaurants to restaurant_deleted
		await tx.restaurant_deleted.createMany({
			data: restaurants.map((r) => {
				const manager = managers.find((m) => m.restaurant_id === r.id);
				return {
					id: r.id,
					name: r.name,
					client_id: r.client_id,
					client_name: r.client?.name ?? "",
					manager_id: manager?.id || null,
					manager_name: manager ? `${manager.first_name} ${manager.last_name}` : "",
					city: r.city,
					google_place_id: r.google_place_id,
					latitude: r.latitude,
					line_one: r.line_one,
					line_two: r.line_two,
					longitude: r.longitude,
					pincode: r.pincode,
					state: r.state,
					x_primary_key: r.id,
				};
			}),
		});

		// Reassign or Unassign boxes from restaurants in Postgres
		if (boxIds.length > 0) {
			await tx.restaurant_box.deleteMany({
				where: { restaurant_id: { in: ids } },
			});
			if (destination_restaurant_id) {
				await tx.restaurant_box.createMany({
					data: boxIds.map(box_id => ({ box_id, restaurant_id: destination_restaurant_id, status: "shared" }))
				});
			}
		}

		// Reassign or Unassign employees from restaurants
		await tx.vertical_food_employee.updateMany({
			where: {
				restaurant_id: { in: ids },
				client_id,
			},
			data: { restaurant_id: destination_restaurant_id ?? null },
		});

		// Delete restaurants
		await tx.restaurant.deleteMany({
			where: { id: { in: ids }, client_id },
		});

		// Synchronize MongoDB BoxConfig mappings to prevent orphaned records inside transaction
		if (boxIds.length > 0) {
			if (destination_restaurant_id) {
				await BoxConfig.updateMany(
					{ box_id: { $in: boxIds } },
					{ $set: { restaurant_id: destination_restaurant_id } }
				);
			} else {
				await BoxConfig.updateMany(
					{ box_id: { $in: boxIds } },
					{ $set: { driver_id: null, restaurant_id: null } }
				);
				await tx.vertical_food_employee_box.deleteMany({
					where: { box_id: { in: boxIds } }
				});
			}
		}
	});

	return {
		count: restaurants.length,
		deleted_restaurant_ids: ids,
		affected_box_ids: boxIds,
		affected_employee_count: employeeCount,
	};
};

// ────────────────────────────────────────────
// REACTIVATE suspended restaurants
// ────────────────────────────────────────────

interface ReactivateRestaurantsArgs {
	client_id: string;
	ids: string[];
	reactivate_employees?: boolean; // also reactivate their suspended employees
	reactivate_boxes?: boolean; // also reactivate their suspended boxes
}

export const reactivateRestaurants = async (
	args: ReactivateRestaurantsArgs,
) => {
	const { client_id, ids, reactivate_employees, reactivate_boxes } = args;

	const restaurants = await prisma.restaurant.findMany({
		where: {
			id: { in: ids },
			client_id,
			status: "suspended",
		},
	});

	if (restaurants.length === 0) {
		throw new APIError(
			"No suspended restaurants found to reactivate",
			undefined,
			{ ids },
			404,
		);
	}

	await prisma.$transaction(async (tx) => {
		await tx.restaurant.updateMany({
			where: { id: { in: ids }, client_id },
			data: { status: "active" },
		});

		if (reactivate_employees) {
			await tx.vertical_food_employee.updateMany({
				where: { restaurant_id: { in: ids }, client_id, status: "suspended" },
				data: { status: "active" },
			});
		}

		if (reactivate_boxes) {
			const restaurantBoxIds = await tx.restaurant_box.findMany({
				where: { restaurant_id: { in: ids } },
				select: { box_id: true },
			});
			await tx.box.updateMany({
				where: { id: { in: restaurantBoxIds.map((b) => b.box_id) } },
				data: { status: "active" },
			});
		}
	});

	return { count: restaurants.length };
};

// ────────────────────────────────────────────
// DELETE suspended restaurants (hard delete option)
// ────────────────────────────────────────────

export const deleteSuspendedRestaurants = async (
	args: DeleteRestaurantsArgs,
) => {
	const { client_id, ids } = args;

	const restaurants = await prisma.restaurant.findMany({
		where: {
			id: { in: ids },
			client_id,
		},
		include: { 
			restaurant_boxes: true,
			client: true,
		},
	});

	if (restaurants.length === 0) {
		throw new APIError(
			undefined,
			"food.restaurant.resource.NOT_FOUND",
			{ ids }
		);
	}

	const employeeCount = await prisma.vertical_food_employee.count({
		where: { restaurant_id: { in: ids }, client_id },
	});

	// Archive restaurants to restaurant_deleted
	const restaurantManagers = await prisma.vertical_food_employee.findMany({
		where: { restaurant_id: { in: ids }, role: "manager" }
	});

	const boxIds = restaurants.flatMap((r) => r.restaurant_boxes.map((rb) => rb.box_id));

	await prisma.$transaction(async (tx) => {
		await tx.restaurant_deleted.createMany({
			data: restaurants.map((r) => {
				const manager = restaurantManagers.find(m => m.restaurant_id === r.id);
				return {
					id: r.id,
					name: r.name,
					client_id: r.client_id,
					client_name: r.client?.name ?? "",
					manager_id: manager?.id || null,
					manager_name: manager ? `${manager.first_name} ${manager.last_name}` : "",
					city: r.city,
					google_place_id: r.google_place_id,
					latitude: r.latitude,
					line_one: r.line_one,
					line_two: r.line_two,
					longitude: r.longitude,
					pincode: r.pincode,
					state: r.state,
					x_primary_key: r.id,
				};
			}),
		});

		if (boxIds.length > 0) {
			await tx.restaurant_box.deleteMany({
				where: { restaurant_id: { in: ids } },
			});
		}

		await tx.vertical_food_employee.updateMany({
			where: { restaurant_id: { in: ids }, client_id },
			data: { restaurant_id: null },
		});

		await tx.restaurant.deleteMany({
			where: { id: { in: ids }, client_id },
		});

		if (boxIds.length > 0) {
			await BoxConfig.updateMany(
				{ box_id: { $in: boxIds } },
				{ $set: { driver_id: null, restaurant_id: null } }
			);
			await tx.vertical_food_employee_box.deleteMany({
				where: { box_id: { in: boxIds } }
			});
		}
	});

	return {
		count: restaurants.length,
		deleted_restaurant_ids: ids,
		affected_box_ids: boxIds,
		affected_employee_count: employeeCount,
	};
};

// ────────────────────────────────────────────
// ASSIGN MANAGER to a restaurant
// ────────────────────────────────────────────

interface AssignRestaurantManagerArgs {
	id: string;
	client_id: string;
	manager_id: string | null; // null = unassign
}

export const assignRestaurantManager = async (
	args: AssignRestaurantManagerArgs,
) => {
	const { id, client_id, manager_id } = args;

	const restaurant = await prisma.restaurant.findUnique({
		where: { id, client_id, status: { not: "suspended" } },
	});

	if (!restaurant) {
		throw new APIError(undefined, "food.restaurant.assign.manager.RESTAURANT_NOT_FOUND", undefined, 404);
	}

	if (manager_id) {
		// 1. Verify the manager exists and belongs to the client
		const manager = await prisma.vertical_food_employee.findUnique({
			where: { id: manager_id, client_id },
		});

		if (!manager) {
			throw new APIError("Employee not found or does not belong to this client", undefined, undefined, 404);
		}

		if (manager.role !== "manager") {
			throw new APIError(
				"Only employees with role 'manager' can be assigned as a restaurant manager", 
				"food.restaurant.assign.manager.INVALID_ROLE",
				{ id: manager_id },
				400
			);
		}

		// 2. Check if the manager is already assigned elsewhere
		if (manager.restaurant_id && manager.restaurant_id !== id) {
			throw new APIError(
				`This manager is already assigned to another restaurant. Please unassign them first.`,
				"food.restaurant.assign.manager.REASSIGNMENT_CONFLICT",
				{ id: manager.restaurant_id },
				409
			);
		}

		// 3. Check if THIS restaurant already has a manager
		const currentManager = await prisma.vertical_food_employee.findFirst({
			where: { restaurant_id: id, role: "manager", status: "active" }
		});

		if (currentManager && currentManager.id !== manager_id) {
			throw new APIError(
				"This restaurant already has an active manager! Please unassign them first.",
				"food.restaurant.assign.manager.ALREADY_HAS_MANAGER",
				{ manager_id: currentManager.id },
				400
			);
		}

		// Update the manager
		await prisma.vertical_food_employee.update({
			where: { id: manager_id, client_id },
			data: { restaurant_id: id },
		});
	} else {
		// Unassign any existing manager for this restaurant
		await prisma.vertical_food_employee.updateMany({
			where: { restaurant_id: id, client_id, role: "manager" },
			data: { restaurant_id: null },
		});
	}

	return restaurant;
};

// ────────────────────────────────────────────
// GET employees of a restaurant
// ────────────────────────────────────────────

interface GetRestaurantEmployeesArgs {
	id: string;
	client_id: string;
	status?: "active" | "suspended" | "unassigned";
}

export const getRestaurantEmployees = async (
	args: GetRestaurantEmployeesArgs,
) => {
	const { id, client_id, status } = args;

	const restaurant = await prisma.restaurant.findUnique({
		where: { id, client_id, status: { not: "suspended" } },
	});

	if (!restaurant) {
		throw new APIError(undefined, "food.restaurant.assign.manager.RESTAURANT_NOT_FOUND", undefined, 404);
	}

	const employees = await prisma.vertical_food_employee.findMany({
		where: {
			restaurant_id: id,
			client_id,
			status: status || { not: "suspended" },
		},
	});

	return { restaurant, employees };
};

// ────────────────────────────────────────────
// REMOVE employees from a restaurant (unassign)
// ────────────────────────────────────────────

interface RemoveRestaurantEmployeesArgs {
	id: string; // restaurant id
	client_id: string;
	employee_ids: string[];
}

export const removeRestaurantEmployees = async (
	args: RemoveRestaurantEmployeesArgs,
) => {
	const { id, client_id, employee_ids } = args;

	const restaurant = await prisma.restaurant.findUnique({
		where: { id, client_id, status: { not: "suspended" } },
	});

	if (!restaurant) throw new APIError(undefined, "food.restaurant.assign.manager.RESTAURANT_NOT_FOUND", undefined, 404);

	const employees = await prisma.vertical_food_employee.findMany({
		where: {
			id: { in: employee_ids },
			restaurant_id: id,
			client_id,
		},
	});

	if (employees.length === 0) {
		throw new APIError("No matching employees found in this restaurant", undefined, {
			employee_ids,
		}, 404);
	}

	// Unset restaurant_id
	await prisma.vertical_food_employee.updateMany({
		where: { id: { in: employee_ids }, restaurant_id: id, client_id },
		data: { restaurant_id: null },
	});

	return { removed_count: employees.length };
};

// ────────────────────────────────────────────
// REASSIGN restaurant resources to another restaurant
// ────────────────────────────────────────────

interface ReassignRestaurantArgs {
	from_restaurant_ids: string[];
	to_restaurant_id: string;
	client_id: string;
	reassign_employees?: boolean;
	reassign_boxes?: boolean;
}

export const reassignRestaurantResources = async (
	args: ReassignRestaurantArgs,
) => {
	const {
		from_restaurant_ids,
		to_restaurant_id,
		client_id,
		reassign_employees,
		reassign_boxes,
	} = args;

	if (from_restaurant_ids.includes(to_restaurant_id)) {
		throw new APIError("Self-reassignment target is not allowed", undefined, undefined, 400);
	}

	const [fromRestaurants, toRestaurant] = await Promise.all([
		prisma.restaurant.findMany({
			where: { id: { in: from_restaurant_ids }, client_id, status: { not: "suspended" } },
		}),
		prisma.restaurant.findUnique({
			where: { id: to_restaurant_id, client_id, status: "active" },
		}),
	]);

	if (fromRestaurants.length === 0) throw new APIError("Source restaurants not found", undefined, undefined, 404);
	if (!toRestaurant) throw new APIError(undefined, "food.restaurant.assign.manager.RESTAURANT_NOT_FOUND", undefined, 404);

	await prisma.$transaction(async (tx) => {
		if (reassign_employees) {
			const employeesToMove = await tx.vertical_food_employee.findMany({
				where: { restaurant_id: { in: from_restaurant_ids }, client_id }
			});

			const managersToMove = employeesToMove.filter(e => e.role === "manager");

			if (managersToMove.length > 0) {
				const existingManager = await tx.vertical_food_employee.findFirst({
					where: { restaurant_id: to_restaurant_id, role: "manager" }
				});

				if (existingManager || managersToMove.length > 1) {
					let managerToKeepId = existingManager ? existingManager.id : managersToMove[0]!.id;
					
					const managersToUnassign = managersToMove.filter(m => m.id !== managerToKeepId);
					
					if (managersToUnassign.length > 0) {
						await tx.vertical_food_employee.updateMany({
							where: { id: { in: managersToUnassign.map(m => m.id) } },
							data: { restaurant_id: null }
						});
					}
				}
			}

			const nonManagerEmployees = employeesToMove.filter(e => e.role !== "manager");
			const movingManagers = managersToMove.filter(e => e.role === "manager");
			
			// If there's already an active manager, none of the moving managers should be assigned.
			const existingManager = await tx.vertical_food_employee.findFirst({
				where: { restaurant_id: to_restaurant_id, role: "manager" }
			});
			
			const allowedManagerToAssign = existingManager ? null : movingManagers[0];

			const allMovingIds = [
				...nonManagerEmployees.map(e => e.id),
				...(allowedManagerToAssign ? [allowedManagerToAssign.id] : [])
			];

			if (allMovingIds.length > 0) {
				await tx.vertical_food_employee.updateMany({
					where: { id: { in: allMovingIds }, client_id },
					data: { restaurant_id: to_restaurant_id },
				});
			}
		}

		if (reassign_boxes) {
			const rbs = await tx.restaurant_box.findMany({ where: { restaurant_id: { in: from_restaurant_ids } } });
			const boxIds = rbs.map(rb => rb.box_id);

			await tx.restaurant_box.deleteMany({
				where: { box_id: { in: boxIds } },
			});

			if (boxIds.length > 0) {
				await tx.restaurant_box.createMany({
					data: boxIds.map(box_id => ({ box_id, restaurant_id: to_restaurant_id, status: "shared" }))
				});
			}
		}
	});

	return { from_restaurant_ids, to_restaurant_id };
};

// ────────────────────────────────────────────
// ASSIGN EMPLOYEES to a restaurant
// ────────────────────────────────────────────

interface AssignEmployeesToRestaurantArgs {
	restaurant_id: string;
	employee_ids: string[];
	role: client_employee_role;
	client_id: string;
}

export const assignEmployeesToRestaurant = async (
	args: AssignEmployeesToRestaurantArgs,
) => {
	const { restaurant_id, employee_ids, role, client_id } = args;

	const restaurant = await prisma.restaurant.findUnique({
		where: { id: restaurant_id, client_id, status: "active" },
	});

	if (!restaurant) {
		throw new APIError(undefined, "food.restaurant.assign.manager.RESTAURANT_NOT_FOUND", undefined, 404);
	}

	if (role === "manager") {
		const existingManager = await prisma.vertical_food_employee.findFirst({
			where: { restaurant_id, role: "manager", status: "active" }
		});

		if (existingManager) {
			throw new APIError(
				"This restaurant already has an active manager! Please unassign them first.",
				"food.restaurant.assign.manager.ALREADY_HAS_MANAGER",
				{ manager_id: existingManager.id },
				409
			);
		}

		if (employee_ids.length > 1) {
			throw new APIError(
				"Cannot assign multiple managers to a single restaurant simultaneously.",
				"food.restaurant.assign.manager.MULTIPLE_MANAGERS_NOT_ALLOWED",
				undefined,
				400
			);
		}
	}

	// Update employees' restaurant_id and role
	const updateResult = await prisma.vertical_food_employee.updateMany({
		where: {
			id: { in: employee_ids },
			client_id,
		},
		data: {
			restaurant_id,
			role,
		},
	});

	return updateResult;
};

interface SearchVerticalFoodRestaurantsArgs {
	query?: string;
	client_id: string;
	limit?: number;
	status?: string;
}

export const searchVerticalFoodRestaurants = async (
	args: SearchVerticalFoodRestaurantsArgs,
) => {
	const { query, client_id, limit = 50, status = "all" } = args;

	return prisma.restaurant.findMany({
		where: {
			client_id,
			status:
				status === "all"
					? { not: "suspended" }
					: (status as "active" | "suspended"),
			OR: query
				? [
					{ name: { contains: query } },
					{ city: { contains: query } },
					{ state: { contains: query } },
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
					restaurant_boxes: true,
				},
			},
		},
		take: limit,
	});
};


