import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { actionGrubpacRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { actionGrubpac } from "@/db/actions/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { 
	type hardware_state,
} from "@/db/types";

export const actionGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	actionGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const {
			ids,
			status,
			power_status,
			ioniser_status,
			dual_zone_status,
			zone1_temp,
			zone2_temp,
			adas_status,
			bluetooth_status,
			camera_status,
			gps_status,
			gyrosensor_status,
			save_to_memory_status,
			sim_status,
			solar_status,
			wifi_status,
			turn_signal_status,
			advert_screen_status,
			port_small_status,
			port_big_status,
		} = context.req.valid("json");

		await actionGrubpac({
			ids,
			status,
			power_status: power_status as hardware_state,
			ioniser_status: ioniser_status as hardware_state,
			dual_zone_status: dual_zone_status as hardware_state,
			zone1_temp,
			zone2_temp,
			adas_status: adas_status as hardware_state,
			bluetooth_status: bluetooth_status as hardware_state,
			camera_status: camera_status as hardware_state,
			gps_status: gps_status as hardware_state,
			gyrosensor_status: gyrosensor_status as hardware_state,
			save_to_memory_status: save_to_memory_status as hardware_state,
			sim_status: sim_status as hardware_state,
			solar_status: solar_status as hardware_state,
			wifi_status: wifi_status as hardware_state,
			turn_signal_status: turn_signal_status as hardware_state,
			advert_screen_status: advert_screen_status as hardware_state,
			port_small_status: port_small_status as hardware_state,
			port_big_status: port_big_status as hardware_state,
			client_id,
		});

		try {
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Box status",
					actor: { 
						id: client_id || "Unknown", 
						name: "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: {  }
				});
			}
		} catch (err) { }

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: "Boxes updated successfully",
				data: null,
			},
			{
				status: 200,
			},
		);
	},
);
