import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { deleteBoxesRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { deleteMedicalBoxes } from "@/db/actions/medical/box.actions";

export const deleteGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	deleteBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await deleteMedicalBoxes({ ids, client_id });

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Boxes deleted successfully!",
			data: result,
		});
	},
);
