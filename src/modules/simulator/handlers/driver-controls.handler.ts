import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod";
import { prisma } from "@/db";

export const updateSettingsHandler = createHandlers(
	boxIdParamValidator,
	zValidator("json", z.object({}).passthrough(), (r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}),
	async (context) => {
		const { box_id } = context.req.valid("param");
		const body = context.req.valid("json") as Record<string, any>;

		const mappedData: any = {};
		if (body.is_power_on !== undefined) mappedData.power_status = body.is_power_on ? "on" : "off";
		if (body.zone_1_target_temp !== undefined) mappedData.zone1_temp = body.zone_1_target_temp;
		if (body.zone_2_target_temp !== undefined) mappedData.zone2_temp = body.zone_2_target_temp;
		if (body.BoxCam !== undefined) mappedData.camera_status = body.BoxCam ? "on" : "off";
		if (body.advert_screen !== undefined) mappedData.advert_screen_status = body.advert_screen ? "on" : "off";
		if (body.ioniser !== undefined) mappedData.ioniser_status = body.ioniser ? "on" : "off";
		if (body.light_status !== undefined) mappedData.light_status = body.light_status ? "on" : "off";

		if (Object.keys(mappedData).length > 0) {
			await prisma.box_telemetry_latest.upsert({
				where: { box_id },
				update: mappedData,
				create: {
					id: require("ulid").ulid(),
					box_id,
					...mappedData,
				},
			});
		}

		return context.json<any>(
			{
				status: "success"
			},
			{ status: 200 }
		);
	}
);

export const createConnectionHandler = createHandlers(
	boxIdParamValidator,
	zValidator("json", z.object({}).passthrough(), (r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}),
	async (context) => {
		const { box_id } = context.req.valid("param");
		const body = context.req.valid("json") as Record<string, any>;
		
		await prisma.box.update({
			where: { id: box_id },
			data: { connection_employee_id: body.driver_id }
		}).catch(() => null);

		return context.json<any>(
			{
				status: "success"
			},
			{ status: 200 }
		);
	}
);

export const deleteConnectionHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");

		await prisma.box.update({
			where: { id: box_id },
			data: { connection_employee_id: null }
		}).catch(() => null);

		return context.json<any>(
			{
				status: "success"
			},
			{ status: 200 }
		);
	}
);
