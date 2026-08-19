import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { suspendBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { toggleSuspendHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";
import { fetchHospitalityBoxLogSubjects } from "hospitality/utils/hospitality-log-display.ts";

export const suspendGrubpacHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	suspendBoxesRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { ids } = context.req.valid("json");

		const result = await toggleSuspendHospitalityBoxes({
			ids,
			client_id,
			state: "suspended",
		});

		const updatedCount = result.updated_count;
		const alreadyCount = result.already_in_state_count;

		let message = `${updatedCount} box${updatedCount === 1 ? "" : "es"} suspended successfully.`;
		if (alreadyCount > 0) {
			message += ` ${alreadyCount} box${alreadyCount === 1 ? "" : "es"} ${alreadyCount === 1 ? "was" : "were"} already suspended.`;
		}

		const userObj = user as any;
		const actorName =
			type === "admin"
				? userObj.name
				: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

		const boxSubjects = await fetchHospitalityBoxLogSubjects(ids, client_id);

		for (const id of ids) {
			const subject = boxSubjects.get(id) ?? {
				id,
				name: "Box",
				type: "box" as const,
			};

			await loggerService.log({
				category: "GrubPac",
				type: "Suspension",
				actor: {
					id: user_id,
					name: actorName,
					role: type,
					table: type === "admin" ? "client" : "vertical_hospitality_employee",
				},
				client_id,
				subject,
				metadata: {},
			});
		}

		const response = {
			success: true as const,
			...resolveMessageTemplate("hospitality.box.suspend"),
			message,
			data: result,
		};

		return context.json<APIResponse<null>>(response as any, response.code as any);
	},
);
