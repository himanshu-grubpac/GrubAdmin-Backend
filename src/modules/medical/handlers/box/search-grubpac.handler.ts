import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { searchBoxesRequestQueryValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { searchMedicalBoxes } from "@/db/actions/medical/box.actions";

export const searchGrubpacHandler = createHandlers(
	medicalAuthGuard(),
	searchBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const boxes = await searchMedicalBoxes({ query, client_id, limit, status });

		return context.json<APIResponse<typeof boxes>>({
			success: true,
			code: 200,
			message: "Boxes fetched successfully!",
			data: boxes,
		});
	},
);
