import { createHandlers } from "@/utils/hono-factory.ts";
import { foodAuthGuard } from "@/middlewares/auth";
import { getGrublockRequestQueryValidator } from "food/validators/box.validators.ts";
import { getVerticalFoodBoxes } from "@/db/actions/box.actions.ts";
import { cleanQueryObject } from "@/utils/clean-query.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { resolveMessageTemplate } from "@/utils/message";

export const getGrublockHandler = createHandlers(
	foodAuthGuard(),
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

		const fetchAll = !!group_by || (limit === undefined && page === undefined);

		const { boxes, count } = await getVerticalFoodBoxes({
			client_id,
			status: status as any,
			restaurant_id: restaurant_id as string | null | undefined,
			employee_id: employee_id as string | null | undefined,
			page_number: page,
			page_size: limit,
			fetchAll,
			include_configs: group_by === "power_status",
			connection_status: connection_status as string,
			power_status: power_status as string,
			health_status: health_status as string,
			grublock_status: grublock_status as string,
			restaurant_assigned: restaurant_assigned === "on" ? true : restaurant_assigned === "off" ? false : undefined,
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
		const startIndex = (finalPage - 1) * (finalLimit || 1);
		const endIndex = startIndex + finalLimit;

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
				const sliced = on.slice(startIndex, endIndex);
				groups.on = { 
					array: sliced, 
					count: on.length,
					pagination: calculatePagination(finalPage, finalLimit ?? on.length, on.length),
				};
				totalCount += on.length;
			}
			if (!group_by_selected_table || group_by_selected_table === "off") {
				const sliced = off.slice(startIndex, endIndex);
				groups.off = { 
					array: sliced, 
					count: off.length,
					pagination: calculatePagination(finalPage, finalLimit ?? off.length, off.length),
				};
				totalCount += off.length;
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
				const sliced = locked.slice(startIndex, endIndex);
				groups.locked = { 
					array: sliced, 
					count: locked.length,
					pagination: calculatePagination(finalPage, finalLimit ?? locked.length, locked.length),
				};
				totalCount += locked.length;
			}
			if (!group_by_selected_table || group_by_selected_table === "unlocked") {
				const sliced = unlocked.slice(startIndex, endIndex);
				groups.unlocked = { 
					array: sliced, 
					count: unlocked.length,
					pagination: calculatePagination(finalPage, finalLimit ?? unlocked.length, unlocked.length),
				};
				totalCount += unlocked.length;
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

					const sliced = groupItems.slice(startIndex, endIndex);
					orderedGroups[slug] = {
						array: sliced,
						name: k,
						address: groupItems[0]?.restaurants?.[0]?.full_address,
						count: groupItems.length,
						pagination: calculatePagination(finalPage, finalLimit ?? groupItems.length, groupItems.length),
					};
					totalCountAcrossGroups += groupItems.length;
				});

			if (groups["unassigned"] && (!group_by_selected_table || group_by_selected_table === "unassigned")) {
				const unassignedItems = (groups["unassigned"] as any[]) || [];
				if (unassignedItems.length > 0) {
					const sliced = unassignedItems.slice(startIndex, endIndex);
					orderedGroups["unassigned"] = {
						array: sliced,
						name: "Unassigned",
						count: unassignedItems.length,
						pagination: calculatePagination(finalPage, finalLimit ?? unassignedItems.length, unassignedItems.length),
					};
					totalCountAcrossGroups += unassignedItems.length;
				}
			}

			const response = {
				success: true as const,
				...resolveMessageTemplate("food.common.FETCH_SUCCESS"),
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
				data: { boxes: formattedBoxes, count: formattedBoxes.length },
				pagination: calculatePagination(finalPage, finalLimit ?? count, count),
			},
			{ status: 200 },
		);
	},
);

