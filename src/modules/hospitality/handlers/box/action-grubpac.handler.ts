import { loggerService, type LogType } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { actionGrubpacRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { actionHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { fetchHospitalityBoxLogSubjects } from "hospitality/utils/hospitality-log-display.ts";
import {
	buildSettingsChangedAuditPayload,
	deriveBulkSettingsActionLabel,
	fetchHospitalitySettingsChangedBoxes,
	type SettingsChangedAuditPayload,
} from "hospitality/utils/settings-changed-display.ts";
import { ulid } from "ulid";

function buildHospitalityActionLogSpecs(body: {
	power_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	zone1_temp?: number;
	zone2_temp?: number;
	camera_status?: string;
	advert_screen_status?: string;
	status?: string;
	assign_floor_id?: string | null;
	room?: string | null;
}): { type: LogType; metadata?: Record<string, unknown> }[] {
	const specs: { type: LogType; metadata?: Record<string, unknown> }[] = [];

	if (body.power_status !== undefined) {
		specs.push({
			type: "Box status",
			metadata: { state: body.power_status === "on" ? "ON" : "OFF" },
		});
	}
	if (body.ioniser_status !== undefined) {
		specs.push({
			type: "Ioniser status",
			metadata: { state: body.ioniser_status === "on" ? "ON" : "OFF" },
		});
	}
	if (body.zone1_temp !== undefined) {
		specs.push({
			type: "Temperature set",
			metadata: { zone: "Zone 1", value: body.zone1_temp },
		});
	}
	if (body.zone2_temp !== undefined) {
		specs.push({
			type: "Temperature set",
			metadata: { zone: "Zone 2", value: body.zone2_temp },
		});
	}
	if (body.dual_zone_status !== undefined) {
		specs.push({
			type: "Updation",
			metadata: { field: "dual zone", new_value: body.dual_zone_status },
		});
	}
	if (body.camera_status !== undefined) {
		specs.push({
			type: "Updation",
			metadata: { field: "camera", new_value: body.camera_status },
		});
	}
	if (body.advert_screen_status !== undefined) {
		specs.push({
			type: "Updation",
			metadata: { field: "advert screen", new_value: body.advert_screen_status },
		});
	}
	if (body.status !== undefined) {
		specs.push({
			type: "Updation",
			metadata: { field: "status", new_value: body.status },
		});
	}
	if (body.assign_floor_id !== undefined) {
		specs.push({
			type: body.assign_floor_id ? "Assignment" : "Reassignment",
			metadata: { new_group: body.assign_floor_id ? "group" : "unassigned" },
		});
	}
	if (body.room !== undefined) {
		specs.push({
			type: "Updation",
			metadata: { field: "room", new_value: body.room ?? "" },
		});
	}

	return specs;
}

export const actionGrubpacHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	actionGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
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

		const userObj = user as any;
		const actorName =
			type === "admin"
				? userObj.name
				: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const logSpecs = buildHospitalityActionLogSpecs({
			power_status,
			ioniser_status,
			dual_zone_status,
			zone1_temp,
			zone2_temp,
			camera_status,
			advert_screen_status,
			status,
			assign_floor_id,
			room,
		});

		if (logSpecs.length > 0) {
			const batchId = ulid();
			const actionAt = new Date();
			const actionLabel = deriveBulkSettingsActionLabel({
				power_status,
				ioniser_status,
				dual_zone_status,
				zone1_temp,
				room,
				assign_floor_id,
			});
			const boxSubjects = await fetchHospitalityBoxLogSubjects(ids, client_id);
			const boxMap = await fetchHospitalitySettingsChangedBoxes(ids, client_id);

			let resolvedFloorName: string | undefined;
			if (assign_floor_id) {
				const floor = await prisma.vertical_hospitality_floor.findFirst({
					where: { id: assign_floor_id, client_id },
					select: { name: true },
				});
				resolvedFloorName = floor?.name;
			}

			await Promise.all(
				ids.flatMap((id) => {
					const subject = boxSubjects.get(id) ?? {
						id,
						name: "Box",
						type: "box" as const,
					};

					return logSpecs.map((spec) => {
						const metadata: Record<string, unknown> = {
							...(spec.metadata ?? {}),
							batch_id: batchId,
							settings_action_label: actionLabel,
						};
						if (
							(spec.type === "Assignment" || spec.type === "Reassignment") &&
							assign_floor_id !== undefined
						) {
							metadata.new_group = assign_floor_id
								? (resolvedFloorName ?? "group")
								: "unassigned";
						}

						return loggerService.log({
							category: "GrubPac",
							type: spec.type,
							actor: {
								id: user_id,
								name: actorName,
								role: type,
								table: type === "admin" ? "client" : "vertical_hospitality_employee",
							},
							client_id,
							subject,
							metadata,
						});
					});
				}),
			);

			const settingsChanged = buildSettingsChangedAuditPayload({
				batchId,
				since: actionAt,
				actionLabel,
				boxIds: ids,
				boxMap,
			});

			return context.json<APIResponse<{ settings_changed: SettingsChangedAuditPayload }>>(
				{
					success: true,
					code: 200,
					message: "Boxes updated successfully",
					data: { settings_changed: settingsChanged },
				},
				{
					status: 200,
				},
			);
		}

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
