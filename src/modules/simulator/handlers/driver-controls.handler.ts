import { createHandlers } from "@/utils/hono-factory.ts";
import { boxIdParamValidator } from "../validators/simulator.validators.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { validatorErrorHandler } from "@/utils/zod";
import { prisma } from "@/db";
import { ulid } from "ulid";
import {
	connectSimulatorBox,
	disconnectSimulatorBoxOnPowerOff,
	enforceSimulatorHeartbeatTimeout,
	resetSimulatorBoxConnection,
} from "@/db/actions/simulator.connection.actions.ts";

export const updateSettingsHandler = createHandlers(
	boxIdParamValidator,
	zValidator("json", z.object({}).passthrough(), (r) => {
		if (!r.success) validatorErrorHandler(r.error);
	}),
	async (context) => {
		const { box_id } = context.req.valid("param");
		const body = context.req.valid("json") as Record<string, any>;

		await enforceSimulatorHeartbeatTimeout(box_id);

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
					id: ulid(),
					box_id,
					...mappedData,
				},
			});
		}

		if (body.is_power_on === false) {
			await disconnectSimulatorBoxOnPowerOff(box_id);
		}

		return context.json<any>(
			{
				status: "success",
			},
			{ status: 200 },
		);
	},
);

const connectionBodyValidator = zValidator(
	"json",
	z.object({
		driver_id: z.string().min(1, "driver_id is required"),
	}).passthrough(),
	(r) => {
		if (!r.success) validatorErrorHandler(r.error);
	},
);

export const createConnectionHandler = createHandlers(
	boxIdParamValidator,
	connectionBodyValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const { driver_id } = context.req.valid("json");

		await enforceSimulatorHeartbeatTimeout(box_id);

		const result = await connectSimulatorBox(box_id, driver_id);

		if (!result.ok) {
			return context.json<any>(
				{ status: "error", message: result.message },
				{ status: result.status as 404 | 409 },
			);
		}

		return context.json<any>(
			{
				status: "success",
			},
			{ status: 200 },
		);
	},
);

export const deleteConnectionHandler = createHandlers(
	boxIdParamValidator,
	async (context) => {
		const { box_id } = context.req.valid("param");
		const box = await resetSimulatorBoxConnection(box_id);

		if (!box) {
			return context.json<any>({ status: "error", message: "Box not found" }, { status: 404 });
		}

		return context.json<any>(
			{
				status: "success",
			},
			{ status: 200 },
		);
	},
);
