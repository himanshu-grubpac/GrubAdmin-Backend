import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { reactivateBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import {
	bulkReactivateHospitalityBoxesByFilter,
	toggleSuspendHospitalityBoxes,
} from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { fetchHospitalityBoxLogSubjects } from "hospitality/utils/hospitality-log-display.ts";

export const reactivateGrubpacHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	reactivateBoxesRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type, vertical_id } = context.var;
		const body = context.req.valid("json");
		const { reassign, activate_all } = body;

		const result = activate_all
			? await bulkReactivateHospitalityBoxesByFilter({
					client_id,
					vertical_id: vertical_id || undefined,
					reassign,
					query: body.query,
					floor_assigned: body.floor_assigned,
					room_assigned: body.room_assigned,
				})
			: await toggleSuspendHospitalityBoxes({
					ids: body.ids!,
					client_id,
					state: "active",
					reassign,
				});

		const updatedCount = result.updated_count;
		const alreadyCount = result.already_in_state_count;

		let message = `${updatedCount} box${updatedCount === 1 ? "" : "es"} reactivated successfully.`;
		if (alreadyCount > 0) {
			message += ` ${alreadyCount} box${alreadyCount === 1 ? "" : "es"} ${alreadyCount === 1 ? "was" : "were"} already active.`;
		}

		const userObj = user as any;
		const actorName =
			type === "admin"
				? userObj.name
				: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const actor = {
			id: user_id,
			name: actorName,
			role: type,
			table: type === "admin" ? "client" : "vertical_hospitality_employee",
		} as const;

		if (activate_all) {
			if (updatedCount > 0) {
				await loggerService.log({
					category: "GrubPac",
					type: "Activation",
					actor,
					client_id,
					subject: {
						id: client_id,
						name: "Bulk activation",
						type: "box" as const,
					},
					metadata: {
						bulk: true,
						updated_count: updatedCount,
						reassign: reassign ?? false,
					},
				});
			}
		} else {
			const ids = body.ids!;
			const boxSubjects = await fetchHospitalityBoxLogSubjects(ids, client_id);

			await Promise.all(
				ids.map((id) => {
					const subject = boxSubjects.get(id) ?? {
						id,
						name: "Box",
						type: "box" as const,
					};

					return loggerService.log({
						category: "GrubPac",
						type: "Activation",
						actor,
						client_id,
						subject,
						metadata: {},
					});
				}),
			);
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.box.reactivate"),
			message,
			data: result,
		};

		return context.json<APIResponse<null>>(response as any, response.code as any);
	},
);
