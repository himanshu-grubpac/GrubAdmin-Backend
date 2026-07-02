import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { updateMedicalBoxLockStatus } from "@/db/actions/medical/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";
import type { APIResponse } from "@/types/api";
import { resolveMessageTemplate } from "@/utils/message";

export const emergencyUnlockGrublockHandler = createHandlers(
	medicalAuthGuard(["admin", "manager"]),
	emergencyUnlockGrublockRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type, vertical_id } = context.var;
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
				vertical_id,
			},
			client_id,
			reason,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.common.UPDATE_SUCCESS", { id: ids[0] }),
			message: "Boxes emergency unlocked successfully",
			data: result,
		};

		// Create notification for each emergency unlocked box
		try {
			for (const boxId of ids) {
				await createNotification({
					client_id,
					vertical_id,
					box_id: boxId,
					type: "warning",
					title: "Emergency Unlock",
					description: `Box ${boxId} has been emergency unlocked${reason ? ` (Reason: ${reason})` : ""}`,
				});
			}
		} catch (err) {
			console.error("Failed to create emergency unlock notification:", err);
		}

		return context.json<APIResponse<typeof result>>(response, response.code as 200);
	},
);
