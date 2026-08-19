import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getBoxesRequestQueryValidator } from "hospitality/validators/box.validators.ts";
import {
	getHospitalityBoxes,
	getHospitalityBoxIdsByFilter,
} from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";

export const getGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const query = context.req.valid("query");

		if (query.ids_only) {
			if (query.group_by) {
				throw new APIError(
					"ids_only cannot be combined with group_by",
					undefined,
					undefined,
					400,
				);
			}

			const idsResult = await getHospitalityBoxIdsByFilter({
				client_id,
				vertical_id: vertical_id || undefined,
				status: query.status || undefined,
				query: query.query,
				floor_id: query.floor_id,
				connection_status: query.connection_status,
				power_status: query.power_status,
				health_status: query.health_status,
				ioniser_status: query.ioniser_status,
				dual_zone_status: query.dual_zone_status,
				floor_assigned: query.floor_assigned,
				room_assigned: query.room_assigned,
				zone1_min: query.zone1_min,
				zone1_max: query.zone1_max,
				zone2_min: query.zone2_min,
				zone2_max: query.zone2_max,
				ext_min: query.ext_min,
				ext_max: query.ext_max,
			});

			return context.json<
				APIResponse<{
					ids: string[];
					total_count: number;
					truncated: boolean;
				}>
			>(
				{
					success: true,
					code: 200,
					data: idsResult,
				},
				{ status: 200 },
			);
		}

		const boxesData = await getHospitalityBoxes({
			page: query.page,
			limit: query.limit,
			query: query.query,
			status: query.status || undefined,
			floor_id: query.floor_id,
			client_id,
			vertical_id: vertical_id || undefined,
			group_by: query.group_by,
			group_by_selected_table: query.group_by_selected_table,
			connection_status: query.connection_status,
			power_status: query.power_status,
			health_status: query.health_status,
			ioniser_status: query.ioniser_status,
			dual_zone_status: query.dual_zone_status,
			floor_assigned: query.floor_assigned,
			room_assigned: query.room_assigned,
			zone1_min: query.zone1_min,
			zone1_max: query.zone1_max,
			zone2_min: query.zone2_min,
			zone2_max: query.zone2_max,
			ext_min: query.ext_min,
			ext_max: query.ext_max,
		});

		if (query.group_by && boxesData.groups) {
			return context.json<APIResponse<{ groups: typeof boxesData.groups; total_count: number }>>(
				{
					success: true,
					code: 200,
					data: {
						groups: boxesData.groups,
						total_count: boxesData.total_count,
					},
				},
				{ status: 200 },
			);
		}

		return context.json<APIResponse<{ boxes: typeof boxesData.boxes; count: number; total_count: number }>>(
			{
				success: true,
				code: 200,
				data: {
					boxes: boxesData.boxes,
					count: boxesData.count,
					total_count: boxesData.total_count,
				},
				pagination: boxesData.pagination,
			},
			{ status: 200 },
		);
	},
);
