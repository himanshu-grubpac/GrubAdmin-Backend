import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { deleteBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { deleteHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const deleteGrubpacHandler = createHandlers(
	hospitalityAuthGuard(),
	deleteBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		await deleteHospitalityBoxes({ ids, client_id });

		try {
			const subjects = (context.req.valid("json") as any)?.ids || ((context.req.valid("json") as any)?.id ? [(context.req.valid("json") as any)?.id] : ["Unknown"]);
			for (const id of subjects) {
				await loggerService.log({
					category: "GrubPac",
					type: "Deletion",
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
				message: "Boxes deleted successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
