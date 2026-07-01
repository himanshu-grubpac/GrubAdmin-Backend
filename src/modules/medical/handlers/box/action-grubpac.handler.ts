import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { actionGrubpacRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { actionMedicalBoxes } from "@/db/actions/medical/box.actions";

export const actionGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager", "handler"]),
	actionGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const body = context.req.valid("json") as any;

		const result = await actionMedicalBoxes({
			ids: body.ids,
			client_id,
			status: body.status,
			power_status: body.power_status,
			ioniser_status: body.ioniser_status,
			dual_zone_status: body.dual_zone_status,
			zone1_temp: body.zone1_temp,
			zone2_temp: body.zone2_temp,
			ext_temp: body.ext_temp,
			assign_department_id: body.assign_department_id,
			adas_status: body.adas_status,
			bluetooth_status: body.bluetooth_status,
			camera_status: body.camera_status,
			gps_status: body.gps_status,
			gyrosensor_status: body.gyrosensor_status,
			save_to_memory_status: body.save_to_memory_status,
			sim_status: body.sim_status,
			solar_status: body.solar_status,
			wifi_status: body.wifi_status,
			turn_signal_status: body.turn_signal_status,
			advert_screen_status: body.advert_screen_status,
			port_small_status: body.port_small_status,
			port_big_status: body.port_big_status,
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Box action performed successfully!",
			data: result,
		});
	},
);
