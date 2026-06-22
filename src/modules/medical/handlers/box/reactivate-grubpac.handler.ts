import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { reactivateBoxesRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { toggleSuspendMedicalBoxes } from "@/db/actions/medical/box.actions";

export const reactivateGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	reactivateBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await toggleSuspendMedicalBoxes({
			ids,
			client_id,
			state: "active",
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Boxes reactivated successfully!",
			data: result,
		});
	},
);
