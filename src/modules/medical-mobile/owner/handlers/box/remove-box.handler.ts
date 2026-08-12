import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { unassignOwnerBox } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import { boxIdParamValidator } from "@/modules/medical-mobile/owner/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";

export const removeBoxHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	boxIdParamValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const { box_id } = context.req.valid("param");

		await unassignOwnerBox({ box_id, client_id });

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
				message: "Box removed successfully",
			},
			{ status: 200 },
		);
	},
);
