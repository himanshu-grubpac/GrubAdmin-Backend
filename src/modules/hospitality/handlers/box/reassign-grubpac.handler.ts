import { hospitalityAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reassignBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import { reassignBoxesToFloor } from "@/db/actions/hospitality/box.actions.ts";
import { prisma } from "@/db";
import { loggerService } from "@/services/system-log.ts";
import { fetchHospitalityBoxLogSubjects } from "hospitality/utils/hospitality-log-display.ts";

export const reassignGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	reassignBoxesRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { box_ids, destination_floor_id, room } = context.req.valid("json");

		const existingAssignments = await prisma.vertical_hospitality_floor_box.findMany({
			where: { box_id: { in: box_ids }, floor: { client_id } },
			select: {
				box_id: true,
				room: true,
				floor: { select: { id: true, name: true } },
			},
		});
		const priorByBoxId = new Map(
			existingAssignments.map((row) => [
				row.box_id,
				{ floorId: row.floor.id, floorName: row.floor.name, room: row.room },
			]),
		);

		let destinationFloorName: string | undefined;
		if (destination_floor_id) {
			const destinationFloor = await prisma.vertical_hospitality_floor.findFirst({
				where: { id: destination_floor_id, client_id },
				select: { name: true },
			});
			destinationFloorName = destinationFloor?.name;
		}

		const result = await reassignBoxesToFloor({
			box_ids,
			destination_floor_id,
			room,
			client_id,
		});

		const userObj = user as { name?: string; first_name?: string; last_name?: string };
		const actorName =
			type === "admin"
				? (userObj.name ?? "Manager")
				: `${userObj.first_name ?? ""} ${userObj.last_name ?? ""}`.trim() || "Manager";

		const boxSubjects = await fetchHospitalityBoxLogSubjects(box_ids, client_id);
		const actor = {
			id: user_id,
			name: actorName,
			role: type,
			table: type === "admin" ? "client" : "vertical_hospitality_employee",
		};

		await Promise.all(
			box_ids.flatMap((boxId) => {
				const subject = boxSubjects.get(boxId) ?? {
					id: boxId,
					name: "Box",
					type: "box" as const,
				};
				const prior = priorByBoxId.get(boxId);
				const hadPriorAssignment = Boolean(prior?.floorId);
				const hasNewAssignment = Boolean(destination_floor_id);
				const floorChanged = prior?.floorId !== destination_floor_id;
				const normalizedRoom = room ?? null;
				const roomChanged =
					room !== undefined &&
					String(prior?.room ?? "") !== String(normalizedRoom ?? "");

				const writes: Promise<unknown>[] = [];

				if (floorChanged) {
					const logType = hadPriorAssignment ? "Reassignment" : "Assignment";
					const metadata: Record<string, unknown> = {};

					if (hadPriorAssignment) {
						metadata.old_group = prior!.floorName;
						if (prior!.room) metadata.old_room = prior!.room;
					}
					metadata.new_group = hasNewAssignment
						? (destinationFloorName ?? destination_floor_id)
						: "unassigned";

					writes.push(
						loggerService.log({
							category: "GrubPac",
							type: logType,
							actor,
							client_id,
							subject,
							metadata,
						}),
					);
				}

				if (roomChanged) {
					writes.push(
						loggerService.log({
							category: "GrubPac",
							type: "Updation",
							actor,
							client_id,
							subject,
							metadata: {
								field: "room",
								old_value: prior?.room ?? "",
								new_value: normalizedRoom ?? "",
							},
						}),
					);
				}

				return writes;
			}),
		);

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Boxes reassigned successfully!",
			data: result,
		});
	},
);
