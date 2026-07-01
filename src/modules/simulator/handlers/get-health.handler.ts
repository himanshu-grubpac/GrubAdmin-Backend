import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { prisma } from "@/db";

export const getHealthHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const box = await prisma.box.findUnique({
			where: { id: box_id },
			include: { telemetry: true, lock: true },
		});

		if (!box) {
			return context.json<any>({ status: "error", message: "Box not found" }, { status: 404 });
		}

		return context.json<any>(
			{
				status: "success",
				data: {
					box_id: box.id,
					display_id: box.box_display_id,
					is_locked: box.lock?.lock_status === "locked",
					driver_id: box.connection_employee_id || null,
					restaurant_id: null,
					settings: {
						is_power_on: box.telemetry?.power_status === "on",
						is_dual_zone: false,
						zone_1_target_temp: box.telemetry?.zone1_temp || 4,
						zone_2_target_temp: box.telemetry?.zone2_temp || 4,
						zone_1_status: true,
						zone_2_status: false,
						saveToCard: true,
						Adas: true,
						BoxCam: box.telemetry?.camera_status === "on",
						advert_screen: box.telemetry?.advert_screen_status === "on",
						ioniser: box.telemetry?.ioniser_status === "on",
						light_status: box.telemetry?.light_status === "on"
					}
				}
			},
			{ status: 200 }
		);
	}
);
