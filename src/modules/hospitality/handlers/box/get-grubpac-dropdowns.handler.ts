import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { getHospitalityGrubpacDropdowns } from "@/db/actions/hospitality/box.actions.ts";
import type { APIResponse } from "@/types/api";

export const getGrubpacDropdownsHandler = createHandlers(
	hospitalityAuthGuard(),
	async (context) => {
		const { client_id, vertical_id } = context.var;
		const dropdowns = await getHospitalityGrubpacDropdowns(
			client_id,
			vertical_id || undefined,
		);

		return context.json<APIResponse<typeof dropdowns>>(
			{
				success: true,
				code: 200,
				message: "GrubPac dropdowns fetched successfully",
				data: dropdowns,
			},
			{ status: 200 },
		);
	},
);
