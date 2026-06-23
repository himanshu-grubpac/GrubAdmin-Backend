import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { suspendBoxesRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { toggleSuspendMedicalBoxes } from "@/db/actions/medical/box.actions";

export const suspendGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	suspendBoxesRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { ids } = context.req.valid("json");

		const result = await toggleSuspendMedicalBoxes({
			ids,
			client_id,
			state: "suspended",
		});

		return context.json<APIResponse<typeof result>>({
			success: true,
			code: 200,
			message: "Boxes suspended successfully!",
			data: result,
		});
	},
);
