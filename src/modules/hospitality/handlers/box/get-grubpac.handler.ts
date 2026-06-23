import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getBoxesRequestQueryValidator } from "hospitality/validators/box.validators.ts";
import { getVerticalHospitalityBoxes } from "@/db/actions/vertical-hospitality-box.actions.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { resolveMessageTemplate } from "@/utils/message";

export const getGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const {
			status,
			page,
			limit,
			group_by,
			connection_status,
			power_status,
			health_status,
			ioniser_status,
			dual_zone_status,
			zone1_min,
			zone1_max,
			zone2_min,
			zone2_max,
			ext_min,
			ext_max,
			group_by_selected_table,
			query,
		} = context.req.valid("query") as any;

		let fetchAll = !!group_by || (limit === undefined && page === undefined);
		let resolvedPowerStatus = power_status;
		let resolvedGrublockStatus = undefined; // Hospitality doesn't query lock status directly in args, but gets it from telemetry/lock

		if (group_by_selected_table) {
			if (group_by === "power_status") {
				if (group_by_selected_table === "on" || group_by_selected_table === "off") {
					resolvedPowerStatus = group_by_selected_table;
					fetchAll = false;
				}
			}
		}

		const { boxes, count } = await getVerticalHospitalityBoxes({
			client_id,
			status: status as any,
			page_number: page,
			page_size: limit,
			fetchAll,
			connection_status: connection_status as string,
			power_status: resolvedPowerStatus as string,
			health_status: health_status as string,
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
			power_status: b.telemetry?.power_status || "off",
			grublock_status: b.telemetry?.grublock_status || "unlocked", // hospitality lock status fallback
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

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.common.FETCH_SUCCESS"),
			data: { boxes: formattedBoxes, count: count },
			pagination: calculatePagination(finalPage, finalLimit, count),
		};

		return context.json<APIResponse<{ boxes: typeof formattedBoxes; count: number }>>(
			response,
			response.code as any,
		);
	},
);
