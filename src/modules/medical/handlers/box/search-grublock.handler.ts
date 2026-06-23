import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { searchGrublockRequestQueryValidator } from "medical/validators/box.validators.ts";
import { searchMedicalBoxes } from "@/db/actions/medical/box.actions.ts";
import type { APIResponse } from "@/types/api";
export const searchGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	searchGrublockRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { query, limit, status } = context.req.valid("query");

		const boxes = await searchMedicalBoxes({
			query,
			limit,
			status,
			client_id,
		});

		return context.json<APIResponse<typeof boxes>>(
			{
				success: true,
				code: 200,
				message: "Grublock search results fetched successfully",
				data: boxes,
			},
			{ status: 200 },
		);
	},
);
