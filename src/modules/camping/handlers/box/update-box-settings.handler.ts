import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { updateBoxSettingsRequestBodyValidator } from "camping/validators/box.validators";
import { prisma } from "@/db";
import { BoxConfig } from "@/db/mongo-schema";
import { APIError } from "@/types/error";
import type { APIResponse } from "@/types/api";

export const updateBoxSettingsHandler = createHandlers(
	campingAuthGuard(),
	updateBoxSettingsRequestBodyValidator,
	async (context) => {
		const box_id = context.req.param("box_id");
		const client_id = context.get("client_id");
		const {
			name,
			zone1_target_temp,
			zone2_target_temp,
			zone1_status,
			zone2_status,
			ioniser_status,
			surveillance_mode,
		} = context.req.valid("json");

		const updatedBox = await prisma.$transaction(async (tx) => {
			const box = await tx.box.findFirst({
				where: {
					id: box_id,
					client_id,
					status: { not: "suspended" },
				},
			});

			if (!box) {
				throw new APIError(undefined, "camping.box.NOT_FOUND");
			}

			// Update box name if provided
			if (name !== undefined) {
				await tx.box.update({
					where: { id: box.id },
					data: { name: name.trim() },
				});
			}

			// Update telemetry
			const telemetryData: any = {};
			if (zone1_target_temp !== undefined) telemetryData.zone1_target_temp = zone1_target_temp;
			if (zone2_target_temp !== undefined) telemetryData.zone2_target_temp = zone2_target_temp;
			if (zone1_status !== undefined) telemetryData.zone1_status = zone1_status;
			if (zone2_status !== undefined) telemetryData.zone2_status = zone2_status;
			if (ioniser_status !== undefined) telemetryData.ioniser_status = ioniser_status;

			if (Object.keys(telemetryData).length > 0) {
				await tx.box_telemetry_latest.upsert({
					where: { box_id: box.id },
					create: {
						box_id: box.id,
						...telemetryData,
					},
					update: telemetryData,
				});
			}

			// Update MongoDB Config
			try {
				const mongoUpdate: any = {};
				if (ioniser_status !== undefined) {
					mongoUpdate.ioniser = ioniser_status === "on";
				}
				if (surveillance_mode !== undefined) {
					mongoUpdate.surveillance_mode = surveillance_mode;
				}
				if (Object.keys(mongoUpdate).length > 0) {
					await BoxConfig.updateOne(
						{ box_id: box.id },
						{ $set: mongoUpdate }
					);
				}
			} catch (err) {
				console.error("Failed to update BoxConfig in MongoDB:", err);
			}

			return tx.box.findUnique({
				where: { id: box.id },
				include: {
					telemetry: true,
					lock: true,
				},
			});
		});

		if (!updatedBox) {
			throw new APIError(undefined, "camping.box.NOT_FOUND");
		}

		const telemetry = updatedBox.telemetry;

		let surveillanceMode = false;
		try {
			const config = await BoxConfig.findOne({ box_id: updatedBox.id });
			if (config && config.surveillance_mode !== undefined) {
				surveillanceMode = config.surveillance_mode;
			}
		} catch (err) {
			console.error("Failed to fetch BoxConfig surveillance_mode:", err);
		}

		const responseData = {
			id: updatedBox.id,
			box_display_id: updatedBox.box_display_id,
			settings: {
				name: updatedBox.name || "",
				zone1_target_temp: telemetry?.zone1_target_temp ?? null,
				zone2_target_temp: telemetry?.zone2_target_temp ?? null,
				zone1_status: telemetry?.zone1_status ?? "off",
				zone2_status: telemetry?.zone2_status ?? "off",
				ioniser_status: telemetry?.ioniser_status ?? "off",
				surveillance_mode: surveillanceMode,
			},
		};

		return context.json<APIResponse<typeof responseData>>({
			success: true,
			code: 200,
			message: "Box settings updated successfully",
			data: responseData,
		});
	},
);
