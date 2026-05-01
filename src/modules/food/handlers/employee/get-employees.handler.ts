import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { getEmployeesRequestQueryValidator } from "food/validators/employee.validators.ts";
import {
	getDeletedVerticalFoodEmployees,
	getVerticalFoodEmployees,
} from "@/db/actions/vertical-food-employee.actions";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { withFullNames } from "@/utils/employee.ts";
import { prisma } from "@/db";
import { cleanQueryObject } from "@/utils/clean-query.ts";

export const getEmployeesHandler = createHandlers(
	foodAuthGuard(),
	getEmployeesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;

		const {
			query,
			status,
			limit,
			page,
			restaurant_ids,
			restaurant_id,
			group_by,
			group_by_restaurants_has_driver,
			with_permission_for_box_id,
			with_employees_for_access_mode,
			with_connected_boxes,
			group_by_selected_table,
		} = context.req.valid("query") as any;

		const finalPageSize = limit;
		const finalPageNumber = page;

		// Merge "role" (single) and "roles[]" (array) from queries
		const singleRole = context.req.query("role");
		const rolesArrayQuery = context.req.queries("roles[]") || [];
		const rawRoles = [
			...(singleRole ? [singleRole] : []),
			...rolesArrayQuery,
		];
		
		let allRoles: string[] | undefined = undefined;
		if (rawRoles.length > 0) {
			allRoles = Array.from(new Set(rawRoles.map((r) => (r === "driver" ? "delivery" : r))));
		}

		// Merge restaurant_id into restaurant_ids list
		let allRestaurantIds: string[] | undefined = undefined;
		if (restaurant_ids || restaurant_id) {
			const arr = Array.isArray(restaurant_ids)
				? restaurant_ids
				: restaurant_ids
					? [restaurant_ids]
					: [];
			if (restaurant_id) arr.push(restaurant_id);
			allRestaurantIds = arr.length > 0 ? arr : undefined;
		}

		let dbStatus: any = undefined;
		if (status === "unassigned") {
			dbStatus = "unassigned";
		} else if (status === "active" || status === "suspended") {
			dbStatus = status;
		}

		let finalFilteredRestaurantIds = allRestaurantIds;
		if (with_employees_for_access_mode === "all_employees" || with_employees_for_access_mode === "public") {
			finalFilteredRestaurantIds = undefined;
		} else if (with_employees_for_access_mode === "restaurant_employees") {
			if (with_permission_for_box_id) {
				const rbs = await prisma.restaurant_box.findMany({
					where: { box_id: with_permission_for_box_id },
					select: { restaurant_id: true },
				});
				finalFilteredRestaurantIds = rbs.map((rb) => rb.restaurant_id);
			} else {
				finalFilteredRestaurantIds = allRestaurantIds || [];
			}
		}

		let forceIncludeIds: string[] = [];
		if (with_permission_for_box_id) {
			const blockedPerms = await prisma.vertical_food_employee_box.findMany({
				where: {
					box_id: with_permission_for_box_id,
					status: "blocked",
					NOT: { employee_id: null },
				},
				select: { employee_id: true },
			});
			forceIncludeIds = blockedPerms.map((p) => p.employee_id).filter((id): id is string => !!id);
		}

		const fetchAll = !!group_by;
		
		const employeesData =
			status === "deleted"
				? await getDeletedVerticalFoodEmployees({
						client_id,
						query: query as string | undefined,
						pageSize: finalPageSize,
						pageNumber: finalPageNumber,
						fetchAll,
					})
				: await getVerticalFoodEmployees({
						roles: allRoles as any,
						query: query as string | undefined,
						status: dbStatus,
						restaurant_ids: finalFilteredRestaurantIds,
						pageSize: fetchAll ? undefined : finalPageSize,
						pageNumber: fetchAll ? undefined : finalPageNumber,
						fetchAll,
						client_id,
						include_boxes: true,
						include_restaurant: true,
						force_include_ids: forceIncludeIds,
						include_all_managers: group_by === "boxes",
						with_connected_boxes,
					});

		const finalLimit = (finalPageSize ?? employeesData.count);
		const finalPage = (finalPageNumber ?? 1);
		const startIndex = (finalPage - 1) * (finalLimit || 1);
		const endIndex = startIndex + finalLimit;
		
		let permissionStatuses: Record<string, string> = {};
		if (with_permission_for_box_id) {
			const perms = await prisma.vertical_food_employee_box.findMany({
				where: {
					box_id: with_permission_for_box_id,
					employee_id: { in: (employeesData.employees as any[]).map((e) => e.id) },
				},
				select: {
					employee_id: true,
					status: true,
				},
			});
			for (const p of perms) {
				if (p.employee_id) {
					permissionStatuses[p.employee_id] = p.status;
				}
			}
		}

		const employees = withFullNames(employeesData.employees as any[]).map((e) => {
			if (status === "deleted") {
				const deletedEmp = e as any;
				return {
					...deletedEmp,
					role: deletedEmp.role_name,
					employee_id: deletedEmp.employee_display_id,
					restaurant: null,
					connected_boxes: [],
					connected_boxes_status: false,
					connected_boxes_count: 0,
				};
			}
			return {
				...e,
				employee_id: (e as any).employee_display_id,
				permission_status: with_permission_for_box_id
					? permissionStatuses[(e as any).id] === "blocked"
						? "blocked"
						: null
					: undefined,
			};
		}).sort((a, b) => {
			if (a.permission_status === "blocked" && b.permission_status !== "blocked") return -1;
			if (a.permission_status !== "blocked" && b.permission_status === "blocked") return 1;
			return 0;
		});

		// ── No grouping – flat list ──────────────────────────────────────────
		if (!group_by) {
			return context.json<APIResponse<{ employees: typeof employees; count: number }>>(
				{
					success: true,
					code: 200,
					data: { employees, count: employees.length },
					pagination: calculatePagination(finalPage, finalLimit, employeesData.count),
				},
				{ status: 200 },
			);
		}

		// ── group_by: restaurants ────────────────────────────────────────────
		if (group_by === "restaurants") {
			const groups: Record<string, typeof employees> = {};

			for (const emp of employees) {
				const key = (emp as any).restaurant?.name || "unassigned";
				if (!groups[key]) groups[key] = [];
				groups[key].push(emp);
			}

			const orderedGroups: Record<string, any> = {};
			let totalCount = 0;

			Object.keys(groups)
				.filter((k) => k !== "unassigned")
				.sort()
				.forEach((k) => {
					// Filter for selected table if provided
					if (group_by_selected_table && group_by_selected_table !== k) return;

					const items = groups[k] || [];
					if (group_by_restaurants_has_driver === 1) {
						if (!items.some((emp) => emp.role === "delivery")) return;
					}
					const sliced = items.slice(startIndex, endIndex);
					orderedGroups[k] = {
						array: sliced,
						address: (items[0] as any).restaurant?.full_address,
						count: items.length,
						pagination: calculatePagination(finalPage, finalLimit ?? items.length, items.length),
					};
					totalCount += items.length;
				});

			if (groups["unassigned"] && (!group_by_selected_table || group_by_selected_table === "unassigned")) {
				const items = groups["unassigned"] || [];
				if (group_by_restaurants_has_driver === 1) {
					if (items.some((emp) => emp.role === "delivery")) {
						const sliced = items.slice(startIndex, endIndex);
						orderedGroups["unassigned"] = { 
							array: sliced, 
							count: items.length,
							pagination: calculatePagination(finalPage, finalLimit ?? items.length, items.length),
						};
						totalCount += items.length;
					}
				} else {
					const sliced = items.slice(startIndex, endIndex);
					orderedGroups["unassigned"] = { 
						array: sliced, 
						count: items.length,
						pagination: calculatePagination(finalPage, finalLimit ?? items.length, items.length),
					};
					totalCount += items.length;
				}
			}

			return context.json<APIResponse<{ groups: typeof orderedGroups; count: number; total_count: number }>>(
				{
					success: true,
					code: 200,
					data: { 
						groups: orderedGroups, 
						count: Object.values(orderedGroups).reduce((max, g) => Math.max(max, (g as any).array?.length || 0), 0), 
						total_count: totalCount 
					},
					pagination: calculatePagination(finalPage, finalLimit ?? employeesData.count, employeesData.count),
				},
				{ status: 200 },
			);
		}

		// ── group_by: boxes ──────────────────────────────────────────────────
		if (group_by === "boxes") {
			const connected: typeof employees = [];
			const disconnected: typeof employees = [];
			const managers: typeof employees = [];

			for (const emp of employees) {
				if (emp.role === "manager") {
					managers.push(emp);
				} else if (emp.role === "delivery") {
					const hasBox = (emp as any).connected_boxes_status;
					if (hasBox) {
						connected.push(emp);
					} else {
						disconnected.push(emp);
					}
				} else {
					disconnected.push(emp);
				}
			}

			const groups: Record<string, any> = {};
			let totalCount = 0;

			if (!group_by_selected_table || group_by_selected_table === "connected") {
				const sliced = connected.slice(startIndex, endIndex);
				groups.connected = { 
					array: sliced, 
					count: connected.length,
					pagination: calculatePagination(finalPage, finalLimit ?? connected.length, connected.length),
				};
				totalCount += connected.length;
			}
			if (!group_by_selected_table || group_by_selected_table === "disconnected") {
				const sliced = disconnected.slice(startIndex, endIndex);
				groups.disconnected = { 
					array: sliced, 
					count: disconnected.length,
					pagination: calculatePagination(finalPage, finalLimit ?? disconnected.length, disconnected.length),
				};
				totalCount += disconnected.length;
			}
			if (!group_by_selected_table || group_by_selected_table === "managers") {
				const sliced = managers.slice(startIndex, endIndex);
				groups.managers = { 
					array: sliced, 
					count: managers.length,
					pagination: calculatePagination(finalPage, finalLimit ?? managers.length, managers.length),
				};
				totalCount += managers.length;
			}

			return context.json<APIResponse<{ groups: typeof groups; count: number; total_count: number }>>(
				{
					success: true,
					code: 200,
					data: {
						groups,
						count: Object.values(groups).reduce((max, g) => Math.max(max, (g as any).array?.length || 0), 0),
						total_count: totalCount,
					},
					pagination: calculatePagination(finalPage, finalLimit ?? employeesData.count, employeesData.count),
				},
				{ status: 200 },
			);
		}

		return context.json<APIResponse<{ employees: typeof employees; count: number }>>(
			{
				success: true,
				code: 200,
				data: { employees, count: employees.length },
				pagination: calculatePagination(finalPage, finalLimit ?? employeesData.count, employeesData.count),
			},
			{ status: 200 },
		);
	},
);

