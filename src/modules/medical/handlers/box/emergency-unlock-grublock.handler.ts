import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { updateMedicalBoxLockStatus } from "@/db/actions/medical/box.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const emergencyUnlockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	emergencyUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { ids, reason } = context.req.valid("json");

		const userObj = user as any;
		const userName = type === "admin"
			? (userObj.name as string)
			: `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim();

		const result = await updateMedicalBoxLockStatus({
			ids,
			lock_status: "unlocked",
			user: {
				id: user_id,
				email: userObj.email || "",
				name: userName || "Unknown",
				type,
				role: type,
				client_id,
			},
			reason,
			client_id,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.common.UPDATE_SUCCESS", { id: ids[0] }),
			message: "Boxes emergency unlocked successfully",
			data: {
				...result,
				grublock_status: "unlocked" as const,
			},
		};

		return context.json<APIResponse<typeof result>>(response, response.code as 200);
	},
);
