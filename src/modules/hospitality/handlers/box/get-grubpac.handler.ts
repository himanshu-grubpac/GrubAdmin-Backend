import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getBoxesRequestQueryValidator } from "hospitality/validators/box.validators.ts";
import { getHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { calculatePagination } from "@/utils/pagination.ts";
import { BoxConfig } from "@/db/mongo-schema";

export const getGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const query = context.req.valid("query") as {
			page?: number;
			limit?: number;
			query?: string;
			status?: "active" | "suspended";
			floor_id?: string | null;
			group_by?: "lock_status" | "floors" | "power_status";
			group_by_selected_table?: string;
			connection_status?: string;
			power_status?: string;
			health_status?: string;
			ioniser_status?: string;
			dual_zone_status?: string;
			zone1_min?: number;
			zone1_max?: number;
			zone2_min?: number;
			zone2_max?: number;
			ext_min?: number;
			ext_max?: number;
		};

		const fetchAll = !!query.group_by || (query.limit === undefined && query.page === undefined);

		const boxesData = await getHospitalityBoxes({
			page: fetchAll ? undefined : query.page,
			limit: fetchAll ? undefined : query.limit,
			query: query.query,
			status: query.status,
			floor_id: query.floor_id,
			client_id,
			connection_status: query.connection_status,
			power_status: query.power_status,
			health_status: query.health_status,
			ioniser_status: query.ioniser_status,
			dual_zone_status: query.dual_zone_status,
			zone1_min: query.zone1_min,
			zone1_max: query.zone1_max,
			zone2_min: query.zone2_min,
			zone2_max: query.zone2_max,
			ext_min: query.ext_min,
			ext_max: query.ext_max,
		});

		const formattedBoxes = boxesData.boxes.map((b: any) => ({
			...b,
			box_id: b.box_display_id,
			power_status: b.telemetry?.power_status || "off",
			grublock_status: b.telemetry?.grublock_status || "unlocked",
		}));

		if (query.group_by === "power_status") {
			const groups: Record<string, { boxes: unknown[]; count: number }> = {};
			for (const box of formattedBoxes) {
				const key = box.power_status === "on" ? "on" : box.power_status === "off" ? "off" : "unknown";
				if (query.group_by_selected_table && query.group_by_selected_table !== key) continue;
				if (!groups[key]) groups[key] = { boxes: [], count: 0 };
				groups[key].boxes.push(box);
				groups[key].count += 1;
			}
			return context.json<APIResponse<{ groups: typeof groups }>>(
				{ success: true, code: 200, data: { groups } as any },
				{ status: 200 },
			);
		}

		if (query.group_by === "floors") {
			const groups: Record<string, { boxes: unknown[]; count: number; floor_name?: string }> = {};
			for (const box of formattedBoxes) {
				const dept = box.hospitality_floor_boxes?.[0]?.floor;
				const key = dept?.id ?? "unassigned";
				if (query.group_by_selected_table && query.group_by_selected_table !== key) continue;
				if (!groups[key]) {
					groups[key] = {
						boxes: [],
						count: 0,
						floor_name: dept?.name ?? "Unassigned",
					};
				}
				groups[key].boxes.push(box);
				groups[key].count += 1;
			}
			return context.json<APIResponse<{ groups: typeof groups }>>(
				{ success: true, code: 200, data: { groups } as any },
				{ status: 200 },
			);
		}

		if (query.group_by === "lock_status") {
			const configs = await BoxConfig.find({
				box_id: { $in: formattedBoxes.map((b) => b.id) },
			});
			const lockMap = new Map(configs.map((c) => [c.box_id, c.grublock || "unlocked"]));
			const groups: Record<string, { boxes: unknown[]; count: number }> = {};
			for (const box of formattedBoxes) {
				const key = lockMap.get(box.id) || "unlocked";
				if (query.group_by_selected_table && query.group_by_selected_table !== key) continue;
				if (!groups[key]) groups[key] = { boxes: [], count: 0 };
				groups[key].boxes.push(box);
				groups[key].count += 1;
			}
			return context.json<APIResponse<{ groups: typeof groups }>>(
				{ success: true, code: 200, data: { groups } as any },
				{ status: 200 },
			);
		}

		const finalPage = query.page ?? 1;
		const finalLimit = query.limit;

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				data: { boxes: formattedBoxes, count: boxesData.count },
				pagination: calculatePagination(finalPage, finalLimit ?? boxesData.count, boxesData.count),
			},
			{ status: 200 },
		);
	},
);
