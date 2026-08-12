import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockBodyValidator } from "@/modules/medical-mobile/owner/validators/grublock.validators.ts";
import { resolveOwnerBoxesByIds } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import { emergencyUnlockMedicalBoxes } from "@/db/actions/medical/grublock.actions.ts";
import type { APIResponse } from "@/types/api";
import type { client } from "@/db/types";
import { getOwnerDisplayName } from "@/modules/medical-mobile/owner/handlers/auth/auth.utils.ts";

export const emergencyUnlockHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	emergencyUnlockBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const vertical_id = context.get("vertical_id");
		const user = context.get("user") as client;
		const { ids, reason } = context.req.valid("json");

		await resolveOwnerBoxesByIds({ ids, client_id });

		const result = await emergencyUnlockMedicalBoxes({
			ids,
			client_id,
			vertical_id,
			user: {
				id: user_id,
				email: user.email?.trim() ?? "",
				name: getOwnerDisplayName(user),
				role: "owner",
				type: "admin",
			},
			reason,
		});

		return context.json<APIResponse<typeof result>>(
			{
				success: true,
				code: 200,
				message: "Boxes emergency unlocked successfully",
				data: result,
			},
			{ status: 200 },
		);
	},
);
