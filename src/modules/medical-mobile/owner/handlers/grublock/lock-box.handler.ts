import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalMobileAuthGuard } from "@/middlewares/auth";
import { lockOwnerBoxes } from "@/db/actions/medical-mobile/owner-box.actions.ts";
import { lockGrublockBodyValidator } from "@/modules/medical-mobile/owner/validators/box.validators.ts";
import type { APIResponse } from "@/types/api";
import type { client } from "@/db/types";
import { getOwnerDisplayName } from "@/modules/medical-mobile/owner/handlers/auth/auth.utils.ts";

export const lockGrublockHandler = createHandlers(
	medicalMobileAuthGuard(["admin"], "owner"),
	lockGrublockBodyValidator,
	async (context) => {
		const user_id = context.get("user_id");
		const client_id = context.get("client_id");
		const user = context.get("user") as client;
		const { ids } = context.req.valid("json");

		await lockOwnerBoxes({
			ids,
			client_id,
			user: {
				id: user_id,
				email: user.email?.trim() ?? "",
				name: getOwnerDisplayName(user),
			},
		});

		try {
			for (const boxId of ids) {
				await loggerService.log({
					category: "GrubLock",
					type: "Status",
					actor: {
						id: user_id,
						name: user.email || "Owner",
						role: "owner",
						table: "client",
					},
					client_id,
					subject: { id: boxId, name: boxId, type: "box" },
					metadata: { action: "lock" },
				});
			}
		} catch {
			// Do not block response for logging failure
		}

		return context.json<APIResponse<null>>(
			{
				success: true,
				code: 200,
				message: "Box locked successfully",
				data: null,
			},
			{ status: 200 },
		);
	},
);
