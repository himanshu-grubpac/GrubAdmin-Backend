import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { getGrubpacDetailsRequestQueryValidator } from "medical/validators/box.validators.ts";
import { getMedicalBoxDetails } from "@/db/actions/medical/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const getGrublockDetailsHandler = createHandlers(
	medicalAuthGuard(),
	getGrubpacDetailsRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const { id } = context.req.valid("query");

		const box = await getMedicalBoxDetails({ id, client_id });

		return context.json<APIResponse<any>>(
			{
				success: true,
				code: 200,
				message: "Grublock details fetched successfully",
				data: {
					...box,
					box_id: (box as { box_display_id?: string }).box_display_id,
				},
			},
			{ status: 200 },
		);
	},
);
