import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getGrublockRequestQueryValidator } from "delivery/validators/box.validators.ts";
import { getVerticalDeliveryBoxes } from "@/db/actions/box.actions.ts";
import { cleanQueryObject } from "@/utils/clean-query.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { resolveMessageTemplate } from "@/utils/message";
import { prisma } from "@/db";

export const getGrublockHandler = createHandlers(
	deliveryAuthGuard(),
	getGrublockRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const {
			status,
			group_by,
			restaurant_id,
			employee_id,
			connection_status,
			power_status,
			health_status,
			grublock_status,
			restaurant_assigned,
			vehicle_assigned,
			ioniser_status,
			dual_zone_status,
			zone1_min,
			zone1_max,
			zone2_min,
			zone2_max,
			ext_min,
			ext_max,
			group_by_restaurants_has_offline_box,
			group_by_selected_table,
			page,
			limit,
			query,
		} = context.req.valid("query") as any;

		let fetchAll = !!group_by || (limit === undefined && page === undefined);
		let resolvedRestaurantId = restaurant_id;
		let resolvedPowerStatus = power_status;
		let resolvedGrublockStatus = grublock_status;
		let resolvedRestaurantAssigned = restaurant_assigned;

		if (group_by_selected_table) {
			if (group_by === "power_status") {
				if (group_by_selected_table === "on" || group_by_selected_table === "off") {
					resolvedPowerStatus = group_by_selected_table;
					fetchAll = false;
				}
			} else if (group_by === "lock_status") {
				if (group_by_selected_table === "locked" || group_by_selected_table === "unlocked") {
					resolvedGrublockStatus = group_by_selected_table;
					fetchAll = false;
				}
			} else if (group_by === "restaurants" || group_by === "restaurant") {
				if (group_by_selected_table === "unassigned") {
					resolvedRestaurantAssigned = "off";
					fetchAll = false;
				} else {
					const allRestaurants = await prisma.restaurant.findMany({
						where: { client_id },
						select: { id: true, name: true }
					});
					const matchedRest = allRestaurants.find(r => r.name.toLowerCase().replace(/\s+/g, "_") === group_by_selected_table || r.name === group_by_selected_table);
					if (matchedRest) {
						resolvedRestaurantId = matchedRest.id;
						fetchAll = false;
					}
				}
			}
		}

		const { boxes, count } = await getVerticalDeliveryBoxes({
			client_id,
			status: status as any,
			restaurant_id: resolvedRestaurantId as string | null | undefined,
			employee_id: employee_id as string | null | undefined,
			page_number: page,
			page_size: limit,
			fetchAll,
			include_configs: group_by === "power_status",
			connection_status: connection_status as string,
			power_status: resolvedPowerStatus as string,
			health_status: health_status as string,
			grublock_status: resolvedGrublockStatus as string,
			restaurant_assigned: resolvedRestaurantAssigned === "on" ? true : resolvedRestaurantAssigned === "off" ? false : undefined,
			vehicle_assigned: vehicle_assigned === "on" ? true : vehicle_assigned === "off" ? false : undefined,
			ioniser_status: ioniser_status as string,
			dual_zone_status: dual_zone_status as string,
			zone1_min: zone1_min as number,
			zone1_max: zone1_max as number,
			zone2_min: zone2_min as number,
			zone2_max: zone2_max as number,
			ext_min: ext_min as number,
			ext_max: ext_max as number,
			query: query as string,
		});

		const finalPage = page ?? 1;
		const finalLimit = limit ?? count;
		const startIndex = fetchAll ? (finalPage - 1) * (finalLimit || 1) : 0;
		const endIndex = fetchAll ? startIndex + finalLimit : undefined;

		const formattedBoxes = boxes.map((b: any) => ({
			...b,
			box_id: b.box_display_id,
		}));

		if (group_by === "power_status") {
			const on = formattedBoxes.filter((b: any) => b.power_status === "on");
			const off = formattedBoxes.filter((b: any) => b.power_status !== "on");

			const groups: Record<string, any> = {};
			let totalCount = 0;

			if (!group_by_selected_table || group_by_selected_table === "on") {
				const sliced = fetchAll ? on.slice(startIndex, endIndex) : on;
				groups.on = { 
					array: sliced, 
					count: fetchAll ? on.length : count,
					pagination: calculatePagination(finalPage, finalLimit ?? (fetchAll ? on.length : count), fetchAll ? on.length : count),
				};
				totalCount += fetchAll ? on.length : count;
			}
			if (!group_by_selected_table || group_by_selected_table === "off") {
				const sliced = fetchAll ? off.slice(startIndex, endIndex) : off;
				groups.off = { 
					array: sliced, 
					count: fetchAll ? off.length : count,
					pagination: calculatePagination(finalPage, finalLimit ?? (fetchAll ? off.length : count), fetchAll ? off.length : count),
				};
				totalCount += fetchAll ? off.length : count;
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
					pagination: calculatePagination(finalPage, finalLimit ?? count, count),
				},
				{ status: 200 },
			);
		}

		if (group_by === "lock_status") {
			const locked = formattedBoxes.filter((b: any) => b.grublock_status === "locked");
			const unlocked = formattedBoxes.filter((b: any) => b.grublock_status !== "locked");

			const groups: Record<string, any> = {};
			let totalCount = 0;

			if (!group_by_selected_table || group_by_selected_table === "locked") {
				const sliced = fetchAll ? locked.slice(startIndex, endIndex) : locked;
				groups.locked = { 
					array: sliced, 
					count: fetchAll ? locked.length : count,
					pagination: calculatePagination(finalPage, finalLimit ?? (fetchAll ? locked.length : count), fetchAll ? locked.length : count),
				};
				totalCount += fetchAll ? locked.length : count;
			}
			if (!group_by_selected_table || group_by_selected_table === "unlocked") {
				const sliced = fetchAll ? unlocked.slice(startIndex, endIndex) : unlocked;
				groups.unlocked = { 
					array: sliced, 
					count: fetchAll ? unlocked.length : count,
					pagination: calculatePagination(finalPage, finalLimit ?? (fetchAll ? unlocked.length : count), fetchAll ? unlocked.length : count),
				};
				totalCount += fetchAll ? unlocked.length : count;
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
					pagination: calculatePagination(finalPage, finalLimit ?? count, count),
				},
				{ status: 200 },
			);
		}

		// ── group_by: restaurants ─────────────────────────────────────────────
		if (group_by === "restaurants" || group_by === "restaurant") {
			const groups: Record<string, any[]> = {};

			formattedBoxes.forEach((b: any) => {
				// If the user explicitly wants to hide disconnected boxes while grouping by restaurants
				if (group_by_restaurants_has_offline_box === 0) {
					if (b.connection_status === "disconnected") return;
				}

				const restaurantName = b.restaurants?.[0]?.name;
				const key = restaurantName || "unassigned";
				if (!groups[key]) groups[key] = [];
				groups[key].push(b);
			});

			const orderedGroups: Record<string, any> = {};
			let totalCountAcrossGroups = 0;

			Object.keys(groups)
				.filter((k) => k !== "unassigned")
				.sort()
				.forEach((k) => {
					const slug = k.toLowerCase().replace(/\s+/g, "_");

					// Selective filter for the table views
					if (group_by_selected_table && group_by_selected_table !== slug && group_by_selected_table !== k) return;

					const groupItems = (groups[k] as any[]) || [];
					if (groupItems.length === 0) return;

					const sliced = fetchAll ? groupItems.slice(startIndex, endIndex) : groupItems;
					orderedGroups[slug] = {
						array: sliced,
						name: k,
						address: groupItems[0]?.restaurants?.[0]?.full_address,
						count: fetchAll ? groupItems.length : count,
						pagination: calculatePagination(finalPage, finalLimit ?? (fetchAll ? groupItems.length : count), fetchAll ? groupItems.length : count),
					};
					totalCountAcrossGroups += fetchAll ? groupItems.length : count;
				});

			if (groups["unassigned"] && (!group_by_selected_table || group_by_selected_table === "unassigned")) {
				const unassignedItems = (groups["unassigned"] as any[]) || [];
				if (unassignedItems.length > 0) {
					const sliced = fetchAll ? unassignedItems.slice(startIndex, endIndex) : unassignedItems;
					orderedGroups["unassigned"] = {
						array: sliced,
						name: "Unassigned",
						count: fetchAll ? unassignedItems.length : count,
						pagination: calculatePagination(finalPage, finalLimit ?? (fetchAll ? unassignedItems.length : count), fetchAll ? unassignedItems.length : count),
					};
					totalCountAcrossGroups += unassignedItems.length;
				}
			}

			const response = {
				success: true as const,
				...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
				data: {
					groups: orderedGroups,
					count: totalCountAcrossGroups,
					total_count: count
				},
				pagination: calculatePagination(finalPage, finalLimit ?? count, count),
			};

			return context.json<APIResponse<{ groups: typeof orderedGroups; count: number; total_count: number }>>(
				response,
				response.code as any,
			);
		}

		return context.json<APIResponse<{ boxes: typeof boxes; count: number }>>(
			{
				success: true,
				code: 200,
				data: { boxes: formattedBoxes, count: count },
				pagination: calculatePagination(finalPage, finalLimit ?? count, count),
			},
			{ status: 200 },
		);
	},
);
