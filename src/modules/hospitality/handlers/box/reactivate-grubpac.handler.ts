import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { reactivateBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { toggleSuspendHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const reactivateGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	reactivateBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids, reassign } = context.req.valid("json");

		const result = await toggleSuspendHospitalityBoxes({
			ids,
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

		try {
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Activation",
					actor: { 
						id: client_id || "Unknown", 
						name: "Admin", 
						role: "admin", 
						table: "client" 
					},
					client_id,
					subject: { id: id, name: id, type: "box" },
					metadata: {  }
				});
			}
		} catch (err) { }

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message,
				data: null,
			},
			{
				status: 200,
			},
		);
	},
);
