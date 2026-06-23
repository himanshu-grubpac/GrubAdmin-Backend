import { loggerService } from "@/services/system-log.ts";
import { createHandlers } from "@/utils/hono-factory.ts";
import { medicalAuthGuard } from "@/middlewares/auth";
import { emergencyUnlockGrublockRequestBodyValidator } from "medical/validators/box.validators.ts";
import { updateBoxLockStatus } from "@/db/actions/box.actions.ts";
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

		const result = await updateBoxLockStatus({
			ids,
			lock_status: "unlocked",
			user: {
				id: user_id,
				email: userObj.email || "",
				name: userName || "Unknown",
			},
			reason,
			client_id,
		});

		const response = {
			success: true as const,
			...resolveMessageTemplate("medical.common.UPDATE_SUCCESS", { id: ids[0] }),
			message: "Boxes emergency unlocked successfully",
			data: result,
		};

		try {
			for (const id of ids) {
				await loggerService.log({
					category: "GrubLock",
					type: "Emergency unlock",
					actor: { id: user_id, name: userName, role: type, table: type === "admin" ? "client" : "vertical_medical_employee" },
					client_id,
					subject: { id, name: id, type: "box" },
					metadata: { reason },
				});
			}
		} catch {
			// non-fatal
		}

		return context.json<APIResponse<typeof result>>(response, response.code as 200);
	},
);
