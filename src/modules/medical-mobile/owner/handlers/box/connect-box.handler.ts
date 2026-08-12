import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { connectOwnerBox } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import { boxIdParamValidator } from "@/modules/medical-mobile/owner/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { MobileBoxConnectionResult } from "@/types/mobile-box";

export const connectBoxHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		const data = await connectOwnerBox({ box_id, client_id });

		return context.json<APIResponse<MobileBoxConnectionResult>>(
			{
				success: true,
				code: 200,
				message: "Box connected successfully",
				data,
			},
			{ status: 200 },
		);
	},
);
