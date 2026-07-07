import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { actionGrubpacRequestBodyValidator } from "delivery/validators/box.validators.ts";
import { actionGrubpac } from "@/db/actions/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { 
	type box_status,
	type hardware_state,
} from "@/db/types";


export const actionGrubpacHandler = createHandlers(
	deliveryAuthGuard(["admin"]),
	actionGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const {
			ids,
			status,
			power_status,
			ioniser_status,
			dual_zone_status,
			zone1_temp,
			zone2_temp,
			assign_restaurant_id,
			vehicle_number,
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
			assign_restaurant_id,
			vehicle_number,
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

		const hasSettingsChange =
			power_status !== undefined ||
			ioniser_status !== undefined ||
			dual_zone_status !== undefined ||
			zone1_temp !== undefined ||
			zone2_temp !== undefined ||
			adas_status !== undefined ||
			bluetooth_status !== undefined ||
			camera_status !== undefined ||
			gps_status !== undefined ||
			gyrosensor_status !== undefined ||
			save_to_memory_status !== undefined ||
			sim_status !== undefined ||
			solar_status !== undefined ||
			wifi_status !== undefined ||
			turn_signal_status !== undefined ||
			advert_screen_status !== undefined ||
			port_small_status !== undefined ||
			port_big_status !== undefined;

		if (hasSettingsChange) {
			try {
				for (const boxId of ids) {
					await createNotification({
						client_id,
						vertical_id,
						box_id: boxId,
						type: "success",
						title: "GrubPac settings updated",
						description: `Settings were updated for box ${boxId}`,
					});
				}
			} catch (err) {
				console.error("Failed to create settings update notification:", err);
			}
		}



		
		// Start auto-injected log
		try {
			// Find subjects from result if array or use req body
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Box status",
					actor: { 
						id: (context.var as any).client_id || (context.var as any).admin_id || "Unknown", 
						name: (context.var as any).admin_name || (context.var as any).employee_id || "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id: context.var.client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: {  }
				});
			}
		} catch (err) { }
		// End auto-injected log

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
