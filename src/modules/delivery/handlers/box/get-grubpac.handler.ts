import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { getBoxesRequestQueryValidator } from "delivery/validators/box.validators.ts";
import { getDeliveryGrubpacList } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const getGrubpacHandler = createHandlers(
	deliveryAuthGuard(),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const {
			status,
			restaurant_id,
			employee_id,
			page,
			limit,
			group_by,
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
			permission_status,
			group_by_restaurants_has_offline_box,
			group_by_selected_table,
			query,
		} = context.req.valid("query") as any;

		const result = await getDeliveryGrubpacList({
			client_id,
			status: status as any,
			restaurant_id: restaurant_id as string | null | undefined,
			employee_id: employee_id as string | null | undefined,
			page_number: page,
			page_size: limit,
			group_by,
			group_by_selected_table,
			group_by_restaurants_has_offline_box,
			connection_status: connection_status as string,
			power_status: power_status as string,
			health_status: health_status as string,
			grublock_status: grublock_status as string,
			restaurant_assigned:
				restaurant_assigned === "on"
					? true
					: restaurant_assigned === "off"
						? false
						: undefined,
			vehicle_assigned:
				vehicle_assigned === "on"
					? true
					: vehicle_assigned === "off"
						? false
						: undefined,
			ioniser_status: ioniser_status as string,
			dual_zone_status: dual_zone_status as string,
			zone1_min: zone1_min as number,
			zone1_max: zone1_max as number,
			zone2_min: zone2_min as number,
			zone2_max: zone2_max as number,
			ext_min: ext_min as number,
			ext_max: ext_max as number,
			permission_status: permission_status as string,
			query: query as string,
		});

		if (group_by && result.groups) {
			const response = {
				success: true as const,
				...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
				data: {
					groups: result.groups,
					count: Object.values(result.groups).reduce(
						(max, group) => Math.max(max, group.array?.length || 0),
						0,
					),
					total_count: result.total_count,
				},
				pagination: result.pagination,
			};

			return context.json<
				APIResponse<{ groups: typeof result.groups; count: number; total_count: number }>
			>(response, response.code as any);
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("delivery.common.FETCH_SUCCESS"),
			data: { boxes: result.boxes ?? [], count: result.count },
			pagination: result.pagination,
		};

		return context.json<APIResponse<{ boxes: typeof result.boxes; count: number }>>(
			response,
			response.code as any,
		);
	},
);
