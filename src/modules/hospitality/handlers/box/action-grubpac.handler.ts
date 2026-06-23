import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { actionGrubpacRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { actionHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";

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
			ext_temp,
			assign_floor_id,
			room,
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

		await actionHospitalityBoxes({
			ids,
			client_id,
			status,
			power_status,
			ioniser_status,
			dual_zone_status,
			zone1_temp,
			zone2_temp,
			ext_temp,
			assign_floor_id,
			room,
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
