import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { deleteBoxesRequestBodyValidator } from "hospitality/validators/box.validators.ts";
import { deleteHospitalityBoxes } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { fetchHospitalityBoxLogSubjects } from "hospitality/utils/hospitality-log-display.ts";

export const deleteGrubpacHandler = createHandlers(
	hospitalityAuthGuard(["admin"]),
	deleteBoxesRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { ids } = context.req.valid("json");

		await deleteHospitalityBoxes({ ids, client_id });

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
				type: "Deletion",
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
